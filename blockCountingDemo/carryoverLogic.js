// Import paper addition modal functions
import { showPaperAdditionFromCarryOver, updatePaperAdditionProgress, createFloatingPaperButton, showPaperAdditionModal } from './paperAddition.js';

/**
 * ============================================================================
 * CARRY-OVER LOGIC - Interactive Addition with Visual Block Regrouping
 * ============================================================================
 * 
 * PURPOSE:
 * This file implements step-by-step interactive carry-over addition where users
 * manipulate visual blocks to understand regrouping (10 ones = 1 ten, etc.)
 * 
 * MAIN ENTRY POINTS (Functions called from outside this file):
 * - startInteractiveCarryOver(state) - Main entry point called from main.js
 * - showStepsModal() - Called from HTML button (globally exposed at bottom)
 * 
 * EXECUTION FLOW MAP:
 * ==================
 * main.js → startInteractiveCarryOver()
 *     ↓
 * detectCarryPlaces() → finds [0,1,2] (which places need regrouping)
 *     ↓
 * processNextCarryStep() → determines if drag-drop or numpad needed
 *     ↓
 * ┌─ startDragDropStep() (if sum ≥ 10)     ┌─ startNumpadStep() (if sum < 10)
 * │   ↓                                    │   ↓
 * │   enableDragDropForCarryStep()         │   setupNumpadForStep()
 * │   ↓                                    │   ↓
 * │   handleInteractiveRegroupingComplete() │   handleNumpadInput()
 * │   ↓                                    │   ↓
 * │   performAutomaticRegrouping()         └─→ moveToNextStep()
 * │   ↓
 * └─→ moveToNextStep() → back to processNextCarryStep() until complete
 * 
 * KEY CONCEPTS:
 * - tempState: Tracks current numbers during multi-step process
 * - carryPlaces: Array of place values that need regrouping (e.g., [0,1] for ones,tens)
 * - step object: Contains placeLabel, instruction, carryNeeded, digit1, digit2, sum
 * 
 * DOM STRUCTURE DEPENDENCIES:
 * - .number-container: Main container for each number (num1, num2)
 * - .place-value-stack: Container for blocks of same place value
 * - .vertical-block-container: Actual stack of blocks within a place
 * - .place-value-legend: Shows breakdown like "3 × 100 = 300 (Hundreds)"
 * - .block: Individual visual block elements
 * 
 * FUNCTION CATEGORIES & KEY FUNCTIONS:
 * 🚀 MAIN ENTRY POINTS: startInteractiveCarryOver(), showStepsModal()
 * 🧮 STEP CALCULATION: detectCarryPlaces(), calculateCurrentStep(), processNextCarryStep()
 * 🎯 DRAG-DROP: startDragDropStep(), enableDragDropForCarryStep(), handleInteractiveRegroupingComplete()
 * 🔢 NUMPAD: startNumpadStep(), setupNumpadForStep(), handleNumpadInput()
 * 🧱 BLOCK MANIPULATION: createBlockInPlace(), removeBlocksFromPlace(), performAutomaticRegrouping()
 * 📊 STATE MANAGEMENT: ensureTempStateInitialized(), updateTempStateFromBlocks(), updateAllRowPlaceValues()
 * 💬 UI & FEEDBACK: showStepExplanationModal(), showStepSuccess(), showCarryOverCompletion()
 */

// Enhanced Carry-over Logic - Complete demo implementation
import { state, showCompletion } from "./main.js";

let tempState = null;

// Function to reset tempState (call this when generating new problems)
export function resetTempState() {
  tempState = null;
}

// Function to ensure tempState is initialized with current state
export function ensureTempStateInitialized() {
  // Always refresh tempState with current state to handle new problems
  if(!tempState){
    tempState = { ...state };
  }
  
  return tempState;
}

export function detectCarryPlaces(num1, num2, digits = 4) {
  const carries = [];

  // Check each place value directly using getDigit logic
  for (let placeIndex = 0; placeIndex < digits; placeIndex++) {
    const d1 = Math.floor(num1 / Math.pow(10, placeIndex)) % 10;
    const d2 = Math.floor(num2 / Math.pow(10, placeIndex)) % 10;
    if (d1 + d2 >= 10) {
      carries.push(placeIndex); // placeIndex: 0=ones, 1=tens, 2=hundreds, 3=thousands
    }
  }

  return carries;
}



export function getNextCarryPlace(currentIndex, carryPlaces) {
  const idx = carryPlaces.indexOf(currentIndex);
  return carryPlaces[idx + 1] ?? null;
}

// Main function to start the interactive step-by-step carry-over process
export function startInteractiveCarryOver(state) {
  console.log('🚀 Starting interactive carry-over with state:', state);
  
  // Reset and initialize temp state
  resetTempState();
  const currentTempState = ensureTempStateInitialized();
  
  // Store original numbers in temp state
  currentTempState.originalNum1 = state.num1;
  currentTempState.originalNum2 = state.num2;
  currentTempState.num1 = state.num1;
  currentTempState.num2 = state.num2;
  currentTempState.currentStepIndex = 0;
  
  // Create floating paper addition button
  
  createFloatingPaperButton(state);
  
  // Initialize step tracking
  initializeStepTracking();
  
  // Set interactive mode flag
  state.interactiveMode = true;
  
  // Show original numbers
  const originalNumbersDiv = document.getElementById('original-numbers');
  const originalProblemText = document.getElementById('original-problem-text');
  originalProblemText.textContent = `${state.originalNum1} + ${state.originalNum2}`;
  originalNumbersDiv.style.display = 'block';
  
  // Clear any existing content
  const questionArea = document.getElementById('question-area');
  questionArea.innerHTML = `
    <div class="interactive-explanation">
      <h3>🎯 Interactive Carry-Over Addition</h3>
      <p>Let's solve <strong>${state.originalNum1} + ${state.originalNum2}</strong> step by step!</p>
      <p>We'll work through each place value, showing you exactly what happens during regrouping.</p>
    </div>
  `;

  // Show initial explanation modal
  const initialContent = `
    <p>Welcome to Interactive Carry-Over Addition!</p>
    <p>We'll solve <strong>${state.originalNum1} + ${state.originalNum2}</strong> step by step.</p>
    <p>You'll learn exactly what happens during regrouping by dragging blocks and using the number pad.</p>
    <p>The original problem will always be shown at the top, and the current numbers will update as we work through each step.</p>
  `;
  
  showModal('🎯 Interactive Carry-Over Addition', initialContent, () => {
    // Start processing steps after user clicks OK
    processNextCarryStep(state, true); // true = isInitialSetup
  });
}

// Process the next step in the carry-over sequence
export async function processNextCarryStep(state, isInitialSetup = false) {
  console.log('📋 Processing next carry step...');
  console.log('🔍 Is initial setup:', isInitialSetup);
  state.paperProgress = true;
  
  createFloatingPaperButton(state);
  const currentTempState = ensureTempStateInitialized();
  console.log('Current tempState:', currentTempState);
  const currentIndex = currentTempState.currentStepIndex;
  const DisplayPaperAdditionModal = async (currentTempState) => {
 
    console.log('Current step index:', currentIndex);
    await showPaperAdditionFromCarryOver(
     currentTempState,currentTempState.placeLabels[currentIndex]  );
    
    // Update paper addition modal progress if it's open
    if (currentTempState.stepDetails && currentTempState.stepDetails.length > 0) {
      const currentStep = currentTempState.stepDetails[currentIndex-1];
      if (currentStep && currentStep.placeLabel) {
        
        updatePaperAdditionProgress(currentStep.placeLabel);
      }
    }
  
   }

  // Only show modal if this is NOT the initial setup
  if (!isInitialSetup) {
    await DisplayPaperAdditionModal(currentTempState);
  } else {
    console.log('🚫 Skipping modal during initial setup');
  }
  

  // Calculate the current step dynamically based on actual current numbers
  const currentStep = calculateCurrentStep(state, currentIndex);

  if (!currentStep) {
    // All steps completed
    console.log('✅ All steps completed!');
    showCompletion();
    showCarryOverCompletion();
    return;
  }

  console.log('🔍 DETAILED STEP INFO (DYNAMIC):');
  console.log('  - Step index:', currentStep.placeIndex);
  console.log('  - Place label:', currentStep.placeLabel);
  console.log('  - Digits:', currentStep.digit1, '+', currentStep.digit2);
  console.log('  - Sum:', currentStep.sum);
  console.log('  - Interaction type:', currentStep.interactionType);
  console.log('  - Current numbers:', currentStep.beforeNum1, '+', currentStep.beforeNum2);
  console.log('  - Explanations:', currentStep.explanations);

  if (currentStep.interactionType === 'drag-drop') {
    console.log('🔄 Starting drag-drop step for', currentStep.placeLabel);
    toggleInstructions()
    startDragDropStep(state, currentStep);
  } else {
    console.log('🔢 Starting numpad step for', currentStep.placeLabel);
    toggleInstructions()
    startNumpadStep(state, currentStep);
  }
}

// Calculate the current step dynamically based on actual current state
function calculateCurrentStep(state, stepIndex) {
  console.log('🧮 Calculating dynamic step', stepIndex, 'with current state:', state);

  // Get current actual numbers from tempState
  const currentTempState = ensureTempStateInitialized();
  const currentNum1 = currentTempState.num1 || state.originalNum1;
  const currentNum2 = currentTempState.num2 || state.originalNum2;

  console.log('Using current numbers:', currentNum1, '+', currentNum2);

  const placeLabels = state.placeLabels;

  if (stepIndex >= placeLabels.length) {
    return null; // No more steps
  }

  const placeIndex = stepIndex;
  const placeLabel = placeLabels[placeIndex];

  // Get digits from current numbers
  const d1 = Math.floor(currentNum1 / Math.pow(10, placeIndex)) % 10;
  const d2 = Math.floor(currentNum2 / Math.pow(10, placeIndex)) % 10;
  const sum = d1 + d2;

  console.log(`Dynamic calculation for ${placeLabel}: ${d1} + ${d2} = ${sum}`);

  // Generate explanations based on current state
  const explanations = generateDynamicStepExplanations(placeIndex, d1, d2, sum, currentNum1, currentNum2, stepIndex);

  // Generate instruction based on interaction type
  let instruction = '';
  if (sum >= 10) {
    // Drag-drop instruction
    const lowerDigit = d1 > d2 ? d2 : d1;
    const upperDigit = d1 > d2 ? d1 : d2;
    const blocksToMove = 10 - upperDigit;
    instruction = `Drag ${blocksToMove} block(s) from ${lowerDigit} towards ${upperDigit} blocks to regroup 10 blocks into ${Math.floor(sum / 10)} block(s) of the next higher place value.`;
  } else {
    // Numpad instruction
    instruction = `Use the numpad to enter the result: ${sum % 10}`;
  }

  return {
    placeIndex,
    placeLabel,
    digit1: d1,
    digit2: d2,
    sum: sum,
    needsCarry: sum >= 10,
    carryNeeded: sum >= 10,
    interactionType: sum >= 10 ? 'drag-drop' : 'numpad',
    result: sum % 10,
    carryOut: Math.floor(sum / 10),
    beforeNum1: currentNum1,
    beforeNum2: currentNum2,
    explanations: explanations,
    instruction: instruction,
    stepIndex: stepIndex
  };
}

// Generate explanations based on current actual state
function generateDynamicStepExplanations(placeIndex, d1, d2, sum, currentNum1, currentNum2, stepIndex) {
  const placeLabel = state.placeLabels[placeIndex];
  const explanations = [];

  // Always get the most current numbers from tempState to ensure accuracy
  const currentTempState = ensureTempStateInitialized();
  const actualCurrentNum1 = currentTempState.num1 || currentNum1;
  const actualCurrentNum2 = currentTempState.num2 || currentNum2;

  // Show the current actual state (what students see on screen)
  explanations.push(`We are now working with: ${actualCurrentNum1} + ${actualCurrentNum2}`);

  // If this is not the first step, explain what happened in the previous step
  if (stepIndex > 0) {
    // Check if numbers have changed from regrouping in previous steps
    const originalNum1 = currentTempState.originalNum1 || state.originalNum1;
    const originalNum2 = currentTempState.originalNum2 || state.originalNum2;

    // Calculate what was actually carried from the previous step
    const carryAmount = calculateActualCarry(originalNum2, currentNum2, stepIndex);

    if (carryAmount > 0) {
      explanations.push(`From the previous step, we carried ${carryAmount} to the ${placeLabel} place.`);
      explanations.push(`This means ${originalNum2} became ${currentNum2} (adding ${carryAmount} ${placeLabel.toLowerCase()}).`);
    }
  }

  // Explanation of the addition in this place using current digits
  explanations.push(`Now we add the ${placeLabel.toLowerCase()} digits: ${d1} + ${d2} = ${sum}.`);

  // Explanation of what happens next
  if (sum >= 10) {
    const carryAmount = Math.floor(sum / 10);
    const remainder = sum % 10;
    explanations.push(`Since sum of ${d1} + ${d2} is ${sum} which is ${sum == 10 ? 'equal to' : 'greater than'} 10, we need to regroup!`);
    explanations.push(`We keep ${remainder} in the ${placeLabel} place and carry ${carryAmount} to the next higher place.`);

    if (placeIndex < state.placeLabels.length-1) {
      const nextPlace = state.placeLabels[placeIndex];
      explanations.push(`This ${carryAmount} will be added to the ${nextPlace} place in the next step.`);
    }
  } else {
    explanations.push(`Since ${sum} < 10, no regrouping is needed. We simply write ${sum} in the ${placeLabel} place.`);
  }

  return explanations;
}

// Calculate what was actually carried from the previous step
function calculateActualCarry(originalNum2, currentNum2, currentStepIndex) {
  const placeValue = Math.pow(10, currentStepIndex);
  const originalDigit = Math.floor(originalNum2 / placeValue) % 10;
  const currentDigit = Math.floor(currentNum2 / placeValue) % 10;
  return currentDigit - originalDigit;
}


// Handle drag-and-drop steps (when carry is needed)
function startDragDropStep(state, step) {
  console.log('🎯 Starting drag-drop step for:', step.placeLabel);
  
  // Track step details for enhanced step process display
  trackStepDetails({
    placeLabel: step.placeLabel,
    beforeNum1: step.beforeNum1,
    beforeNum2: step.beforeNum2,
    actionType: 'drag-drop'
  });
  
  // Show floating info panel with current place label
  showFloatingInfoPanel(step.placeLabel);
  // Set up drag-and-drop for this step
  enableDragDropForCarryStep(state, step);
  
  // Show instructions button for visual blocks
  showInstructionsButton();
  const qa = document.getElementById("question-area");
  qa.innerHTML = '';

  const prompt = document.createElement("div");
  prompt.className = "prompt-box";

  let lowerDigit = step.digit1 > step.digit2 ? step.digit2 : step.digit1;
  let upperDigit = step.digit1 > step.digit2 ? step.digit1 : step.digit2;
  const sourceLabel = state.dragSource.querySelector('h4')?.textContent?.trim();
const targetLabel = state.dropTarget.querySelector('h4')?.textContent?.trim();

  // Only show current action and Show Steps button
  let actionHTML = `
    <div class="step-header">
      <h3>🔄 ${step.placeLabel} Place - Drag & Drop</h3>
      <button class="show-steps-btn" onclick="showStepsModal()">📚 Show Steps</button>
    </div>
    <div class="current-action-only">
      <div class="place-value-display">
        <p><strong>🎯 Place Value:</strong> ${step.placeLabel} (${Math.pow(10, step.placeIndex)}s)</p>
      </div>
      <div class="calculation-display">
        <p><strong>📊 Calculation:</strong> ${step.digit1} + ${step.digit2} = ${step.sum} (needs regrouping)</p>
      </div>
      <p><strong>💡 Action:</strong> Drag <span class="block-instructions">${10 - upperDigit}</span> block from ${sourceLabel} towards ${targetLabel} to regroup.</p>
      <div class="number-status"><strong>Current:</strong> ${step.beforeNum1} + ${step.beforeNum2}</div>
    </div>
  `;

  prompt.innerHTML = actionHTML;
  qa.appendChild(prompt); 
  
  // Store current step for the modal
  window.currentStepForModal = step;

  // Ensure the correct blocks are present for this step (don't generate artificial blocks) 

  // ensureCorrectBlocksForStep(state, step);

  
}

// Handle numpad steps (when no carry is needed)
function startNumpadStep(state, step) {
  // Track step details for enhanced step process display
  trackStepDetails({
    placeLabel: step.placeLabel,
    beforeNum1: step.beforeNum1,
    beforeNum2: step.beforeNum2,
    actionType: 'numpad'
  });
  
  // Show floating info panel with current place label
  showFloatingInfoPanel(step.placeLabel);
  
  // Show numpad overlay to indicate blocks are not operable
  showNumpadOverlay();
  
  // Show instructions button for visual blocks
  showInstructionsButton();
  
  const qa = document.getElementById("question-area");
  qa.innerHTML = '';

  const prompt = document.createElement("div");

  prompt.className = "prompt-box";

  // Only show current action and Show Steps button
  let actionHTML = `
    <div class="step-header">
      <h3>➕ ${step.placeLabel} Place - Number Input</h3>
      <button class="show-steps-btn" onclick="showStepsModal()">📚 Show Steps</button>
    </div>
    <div class="current-action-only">
      <div class="place-value-display">
        <p><strong>🎯 Place Value:</strong> ${step.placeLabel} (${Math.pow(10, step.placeIndex)}s)</p>
      </div>
      <div class="calculation-display">
        <p><strong>📊 Calculation:</strong> ${step.digit1} + ${step.digit2} = ${step.sum}</p>
      </div>
      <p><strong>💡 Action:</strong> Use the numpad to enter the result: <strong>${step.result}</strong></p>
      <div class="number-status"><strong>Current:</strong> ${step.beforeNum1} + ${step.beforeNum2}</div>
    </div>
  `;

  prompt.innerHTML = actionHTML;
  qa.appendChild(prompt);
  
  // Store current step for the modal
  window.currentStepForModal = step;

  // Set up numpad for this step
  setupNumpadForStep(state, step);
  
  
}

// Set up numpad interaction for a non-carry step
function setupNumpadForStep(state, step) {

  //need to set up groupifmorethan10
  // Check for any rows that have 10 or more blocks and handle regrouping
  const allPlaceRows = document.querySelectorAll('.place-value-stack');
  const nextPlaceRows = [];
  
  allPlaceRows.forEach(row => {
    const blocks = row.querySelectorAll('.block');
    if (blocks.length >= 10) {
      nextPlaceRows.push({ target: row });
    }
  });
  
  if (nextPlaceRows.length > 0) {
    groupIfMoreThanTen(nextPlaceRows);
  }

  // Clear ALL previous highlighting and handlers
  document.querySelectorAll('.place-value-stack').forEach(el => {
    el.classList.remove('valid-drop-target', 'highlight-place', 'dim-place');
  });
  document.querySelectorAll('.vertical-block-container').forEach(el => {
    el.classList.remove('drop-zone');
  });
  const promptBox = document.querySelector(".prompt-box");

  // Create numpad
  const numpadContainer = document.createElement('div');
  numpadContainer.className = 'numpad-container';

  const numpad = document.createElement('div');
  numpad.className = 'numpad-grid';

  // Create number buttons
  for (let i = 0; i <= 9; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.className = 'numpad-btn';
    button.onclick = () => handleNumpadInput(state, step, i);
    numpad.appendChild(button);
  }

  numpadContainer.appendChild(numpad);
  promptBox.appendChild(numpadContainer);
  toggleInstructions()
}

// Handle numpad input for a step
function handleNumpadInput(state, step, inputValue) {
  const correctAnswer = step.digit1 + step.digit2;
  
  if (inputValue === correctAnswer) {
    // Hide numpad overlay since input is complete
    hideNumpadOverlay();
    state.paperProgress = true;
    // Correct answer - show success and move to next step
    showStepSuccess(step, inputValue);
    
    
    // Update current numbers display
    updateCurrentNumbers();
    updateAllRowPlaceValues();
    

    const currentTempState = ensureTempStateInitialized();
    const showPaperAdditionModal = ()=>{
 
  console.log('Current step index:', currentIndex);
  showPaperAdditionFromCarryOver(
   currentTempState,currentTempState.placeLabels[currentIndex]  );
  
  // Update paper addition modal progress if it's open
  if (currentTempState.stepDetails && currentTempState.stepDetails.length > 0) {
    const currentStep = currentTempState.stepDetails[currentIndex-1];
    if (currentStep && currentStep.placeLabel) {
      updatePaperAdditionProgress(currentStep.placeLabel);
    }
  }

 }
showPaperAdditionFromCarryOver(state);
    currentTempState.currentStepIndex++;
    toggleInstructions()
    
    processNextCarryStep(state);
  } else {
    // Wrong answer - show feedback
    showStepError(step, inputValue, correctAnswer);
  }
}

// Enable drag-and-drop with step-specific validation
function enableDragDropForCarryStep(state, step) {
  const labelToLookFor = step.placeLabel;
  const { drag, drop } = setUpDragDropRows(state,labelToLookFor);
  
  // Block all blocks from being drop targets
  blockAllBlocksFromBeingDropTargets(".block");
  blockAllBlocksFromBeingDropTargets("span");

  
  const onDrop = (e) => {
    e.preventDefault();
    // Ensure we're dropping on the correct vertical-block-container, not on a block
    if (e.target.classList.contains('block')) {
      // If dropped on a block, redirect to the parent vertical-block-container
      const blocksContainer = e.target.closest('.vertical-block-container');
      if (blocksContainer) {
        // Create a new event targeting the vertical-block-container
        const newEvent = { ...e, target: blocksContainer };
        handleInteractiveRegroupingComplete(state, step, newEvent);
      }
      return;
    }
    handleInteractiveRegroupingComplete(state, step, e);
  }
  
  const dropContainer = drop.target.querySelector('.vertical-block-container');
  dropContainer._dropHandler = onDrop;
  dropContainer.addEventListener('drop', onDrop);
  dropContainer.addEventListener('dragover', (e) => e.preventDefault()); // Allow drop
  
  // Add visual feedback for drop zone
  dropContainer.classList.add('drop-zone');
}

// Handle completion of interactive regrouping
function handleInteractiveRegroupingComplete(state, step, dropEvent = null) {

  // Count blocks BEFORE any DOM manipulation happens
  // We need to count what SHOULD be there based on the step calculation
  const draggedBlock = document.querySelector('.dragging');
  
  // Track the dragged block for step details
  if (draggedBlock && dropEvent) {
    const blockValue = draggedBlock.textContent || draggedBlock.getAttribute('data-value') || '1';
    
    // Try multiple methods to get place names
    let fromPlace = 'Unknown';
    let toPlace = 'Unknown';
    let fromNumber = 'Unknown';
    let toNumber = 'Unknown';
    
    // Get from place and number by finding the h4 element that contains the number
    const fromNumberContainer = draggedBlock.closest('.number-container');
    if (fromNumberContainer) {
      // Find the h4 element that contains the number for this container
      const fromH4 = fromNumberContainer.querySelector('h4');
      if (fromH4) {
        // Extract the number from the h4 text content
        const h4Text = fromH4.textContent.trim();
        const numberMatch = h4Text.match(/\d+/);
        if (numberMatch) {
          fromNumber = numberMatch[0];
        }
      }
      
      // Get place from the dragged block's place value stack
      const fromPlaceStack = draggedBlock.closest('.place-value-stack');
      if (fromPlaceStack) {
        const placeHeader = fromPlaceStack.querySelector('.place-stack-label');
        if (placeHeader) {
          fromPlace = placeHeader.textContent.trim();
        }
      }
    }
    
    // Get to place and number by finding the h4 element that contains the number
    const toStack = dropEvent.target.closest('.place-value-stack');
    if (toStack) {
      const toHeader = toStack.querySelector('.place-stack-label');
      if (toHeader) {
        toPlace = toHeader.textContent.trim();
      }
      
      // Get the number container and extract number from h4
      const toNumberContainer = toStack.closest('.number-container');
      if (toNumberContainer) {
        // Find the h4 element that contains the number for this container
        const toH4 = toNumberContainer.querySelector('h4');
        if (toH4) {
          // Extract the number from the h4 text content
          const h4Text = toH4.textContent.trim();
          const numberMatch = h4Text.match(/\d+/);
          if (numberMatch) {
            toNumber = numberMatch[0];
          }
        }
      }
    }
    
    
    trackDraggedBlock({
      value: blockValue,
      fromPlace: fromPlace,
      toPlace: toPlace,
      fromNumber: fromNumber,
      toNumber: toNumber
    });
  }
  try{
    const dragRow = draggedBlock.parentElement;
    //snythetic event when dropped on span
  }catch(e){
    const dragRow = draggedBlock;
  }
  let groupiften = false;
  
  const dropRow = dropEvent.target.classList.contains('vertical-block-container') ? dropEvent.target : dropEvent.target.parentElement;
  // const dropRow = dropRowParent.querySelector('.vertical-block-container');
  const expectedBlocks = step.digit1 + step.digit2;

  // Also count actual blocks for verification
  let actualBlocks = 0;
  actualBlocks = countBlocksInPlace(dropRow);
  console.log("actualBlocks", actualBlocks)
  // since the append blocks run after this block,if the actual blocks are 9, we need to perform automatic regrouping
  if (actualBlocks >= 9) {
    performAutomaticRegrouping(state, step, dropEvent, draggedBlock);
    // update th rows to higher place
    updateHigherPlaceRow(dropRow, state,groupiften=false);
    // After regrouping, update tempState to reflect the new numbers
    updateTempStateFromBlocks();
    updateAllRowPlaceValues();
    updateCurrentNumbers();
    moveToNextStep(state);
  
  } else {
    dropRow.appendChild(draggedBlock);
    draggedBlock.classList.remove('dragging');
    updateAllRowPlaceValues();
    updateTempStateFromBlocks();
    updateCurrentNumbers();
    
    // Check if this step is actually complete (no modal needed for simple drags within the same step)
    // Only advance step if this drag operation completes the current step requirements
    const currentTempState = ensureTempStateInitialized();
    const currentStepAfterDrag = calculateCurrentStep(state, currentTempState.currentStepIndex);
    
    // If the step calculation shows we should move to next step, advance directly
    if (!currentStepAfterDrag || currentStepAfterDrag.stepIndex !== step.stepIndex) {
      handleStepCompletion(`Completed ${step.placeLabel} place step`, () => {
        moveToNextStep(state);
      });
    }
    // Otherwise, just continue with the current step (no modal, no step advance)
  }
}

// Update tempState numbers based on current block state
function updateTempStateFromBlocks() {
  const currentTempState = ensureTempStateInitialized();
  const numberContainers = document.querySelectorAll('.number-container:not(.sum-blocks)');

  if (numberContainers.length >= 2) {
    // Update num1 from first container
    currentTempState.num1 = calculateNumberFromBlocks(numberContainers[0]);
    // Update num2 from second container  
    currentTempState.num2 = calculateNumberFromBlocks(numberContainers[1]);

    console.log(`📊 Updated tempState: ${currentTempState.num1} + ${currentTempState.num2}`);
  }
}

// Count blocks in a specific place value
function countBlocksInPlace(container) {
  if (container.nodeName == "SPAN") {
    // the block-row-container
    container = container.parentElement;
  }

  const rows = container.querySelectorAll('.block');
  return rows.length
}

// Perform automatic regrouping when 10 blocks accumulate
function performAutomaticRegrouping(state, step, dropEvent = null, draggedBlock) {

if(draggedBlock){
  draggedBlock = draggedBlock.parentElement.removeChild(draggedBlock);
}

  // Track the carry operation for step details
  const placeOrder = state.placeLabels;
  const currentIndex = placeOrder.indexOf(step.placeLabel);
  const nextPlace = placeOrder[currentIndex + 1];
  
  trackCarriedBlocks({
    amount: 1, // Always carry 1 block to next place
    blocksRemoved: 10, // Remove 10 blocks from current place
    blocksAdded: 1, // Add 1 block to next place
    fromPlace: step.placeLabel,
    toPlace: nextPlace || 'None'
  });

    removeBlocksFromPlace(step.placeLabel, 10, dropEvent);

  if (nextPlace) {
    const nextPlaceValue = Math.pow(10, currentIndex + 1);
    let { lastDroppedRemoveRow, addedRow, row } = createBlockInPlace(nextPlace, nextPlaceValue, dropEvent);
   

    // Set up drag-drop for the newly created block to be moved to the next place
    setTimeout(() => {
      setupSecondPhaseRegrouping(state, step, nextPlace);
     
    }, 100);
  } else {
    console.log('⚠️ No higher place available for regrouping');
   
  }
}

// Remove specified number of blocks from a place
function removeBlocksFromPlace(placeLabel, count, dropEvent) {
  console.log(`🗑️ Attempting to remove ${count} blocks from ${placeLabel}`);
  let removed = 0;

  // Find the specific container involved in the drag-drop event
  const dropTarget = dropEvent ? dropEvent.target : null;
  const targetContainer = dropTarget ? dropTarget.closest('.number-container') : null;
  
  if (!targetContainer) {
    console.log(`⚠️ No target container found from drop event`);
    return removed;
  }
  
  console.log(`🎯 Targeting specific container for block removal`);
  
  // Look for the place stack with the matching label in the target container
  const placeStacks = targetContainer.querySelectorAll('.place-value-stack');
  
  for (const stack of placeStacks) {
    const label = stack.querySelector('.place-stack-label');
    if (label && label.textContent.trim() === placeLabel) {
      const blockContainer = stack.querySelector('.vertical-block-container');
      if (blockContainer) {
        const blocks = blockContainer.querySelectorAll('.block');
        console.log(`📦 Found ${blocks.length} blocks in ${placeLabel} in target container`);
        
        // Remove blocks from the end (most recently added)
        for (let i = blocks.length - 1; i >= 0 && removed < count; i--) {
          console.log(`🗑️ Removing block ${i + 1} with value ${blocks[i].textContent}`);
          blocks[i].remove();
          removed++;
        }
        
        console.log(`✅ Removed ${removed} blocks from ${placeLabel} in target container`);
        
        // Update the legend manually since blocks have been removed
        updateLegendAfterBlockRemoval(stack, placeLabel, removed, blocks.length - removed);
        
        return removed;
      }
    }
  }
  
  console.log(`⚠️ Could not find place ${placeLabel} in target container`);
  return removed;
}

// Update legend after block removal - handles the case where blocks have already been removed
function updateLegendAfterBlockRemoval(stack, placeLabel, removedCount, remainingCount) {
  console.log(`📊 Updating legend for ${placeLabel}: removed ${removedCount}, remaining ${remainingCount}`);
  
  const numberContainer = stack.closest('.number-container');
  const legend = numberContainer?.querySelector('.place-value-legend');
  
  if (legend) {
    const legendItems = legend.querySelectorAll('.legend-item');
    let targetLegendItem = null;
    
    legendItems.forEach(item => {
      if (item.textContent.includes(`(${placeLabel})`)) {
        targetLegendItem = item;
      }
    });
    
    if (targetLegendItem) {
      // Get the color from the existing legend item
      const colorSpan = targetLegendItem.querySelector('.legend-color');
      const colorClass = colorSpan ? colorSpan.className.split(' ').find(c => c !== 'legend-color') : 'blue';
      
      if (remainingCount > 0) {
        // Calculate the remaining blocks' values
        const remainingBlocks = stack.querySelectorAll('.vertical-block-container .block');
        const counts = {};
        
        remainingBlocks.forEach(block => {
          const val = parseInt(block.textContent.trim(), 10);
          if (!isNaN(val)) {
            counts[val] = (counts[val] || 0) + 1;
          }
        });
        
        // Build the breakdown for remaining blocks
        const breakdown = Object.entries(counts)
          .sort((a, b) => b[0] - a[0])
          .map(([val, count]) => {
            val = parseInt(val);
            const totalValue = val * count;
            return `${count} × ${val} = ${totalValue}`;
          }).join(', ');
        
        targetLegendItem.innerHTML = `<span class="legend-color ${colorClass}"></span>${breakdown} (${placeLabel})`;
        console.log(`📊 Updated ${placeLabel} legend: ${breakdown}`);
      } else {
        // No blocks remaining - remove or hide the legend item
        targetLegendItem.textContent = '';
        console.log(`📊 Hidden ${placeLabel} legend (no blocks remaining)`);
      }
    }
  }
}

// Create a block in the specified place - NO DRAG HANDLERS BY DEFAULT
function createBlockInPlace(placeLabel, blockValue, dropEvent = null) {
  let stackToReturn = null;
  let containers;
  let lastDroppedRemoveRow = false;

  // If a drop event is provided, extract the target container from event.target
  if (dropEvent && dropEvent.target) {
    const targetContainer = dropEvent.target.closest('.number-container');
    containers = targetContainer ? [targetContainer] : document.querySelectorAll('.number-container:not(.sum-blocks)');
  } else {
    // Fallback to searching all containers
    containers = document.querySelectorAll('.number-container:not(.sum-blocks)');
  }

  let addedStack = null;
  for (const container of containers) {
    const placeStacks = container.querySelectorAll('.place-value-stack');
    for (const stack of placeStacks) {
      const label = stack.querySelector('.place-stack-label');
      if (label && label.textContent.trim() === placeLabel) {
        stackToReturn = stack;
        const block = document.createElement('div');
        block.className = 'block carry';
        block.textContent = blockValue;
        block.draggable = false; // DEFAULT TO NON-DRAGGABLE
        block.setAttribute('data-place', placeLabel);
        block.setAttribute('data-value', blockValue);

        const verticalContainer = stack.querySelector('.vertical-block-container');
        if (verticalContainer) {
          verticalContainer.appendChild(block);
          addedStack = stack;
        }
        break;
      }
    }
    if (addedStack) break;
  }

  // If no existing stack found, create a new one
  if (addedStack == null && containers.length > 0) {
    const targetContainer = containers[0];
    const placeStacksContainer = targetContainer.querySelector('.place-stacks-container');
    
    if (placeStacksContainer) {
      // Create new place value stack
      const newStack = document.createElement('div');
      newStack.className = 'place-value-stack';
      
      // Add place label
      const placeStackLabel = document.createElement('div');
      placeStackLabel.className = 'place-stack-label';
      placeStackLabel.textContent = placeLabel;
      newStack.appendChild(placeStackLabel);
      
      // Create vertical container for blocks
      const verticalContainer = document.createElement('div');
      verticalContainer.className = 'vertical-block-container';
      
      // Add the new block
      const block = document.createElement('div');
      block.className = 'block carry';
      block.textContent = blockValue;
      block.draggable = false; // DEFAULT TO NON-DRAGGABLE
      block.setAttribute('data-place', placeLabel);
      block.setAttribute('data-value', blockValue);
      
      verticalContainer.appendChild(block);
      newStack.appendChild(verticalContainer);
      placeStacksContainer.appendChild(newStack);
      //add legend item  
      const legendItem =  document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.textContent = `1x${blockValue}=${blockValue}(${placeLabel})`;
      newStack.parentElement.parentElement.querySelector(".place-value-legend").appendChild(legendItem);  
      
      addedStack = newStack;
      stackToReturn = newStack;
      
    }
  }
  
  return { lastDroppedRemoveRow, addedRow: addedStack};
}




function setUpDragDropRows(state,labelToLookFor) {
  let dragSourceRow;
  let dropTargetRow;
  const currentTempState = ensureTempStateInitialized();

  // Clear ALL previous highlighting and handlers
  document.querySelectorAll('.place-value-stack').forEach(el => {
    el.classList.remove('valid-drop-target', 'highlight-place', 'dim-place');
  });
  document.querySelectorAll('.vertical-block-container').forEach(el => {
    el.classList.remove('drop-zone');
  });

  // Get all number containers to work within the correct context
  const numberContainers = document.querySelectorAll('.number-container');
  let dragSourceContainer = null;
  let dropTargetContainer = null;
  
  // Find containers with blocks for the target place and compare block counts
  let container1Info = null;
  let container2Info = null;
  
  numberContainers.forEach((container, containerIndex) => {
    const placeStacks = container.querySelectorAll('.place-value-stack');
    placeStacks.forEach(stack => {
      const placeLabel = stack.querySelector('.place-stack-label');
      const placeLabelText = placeLabel?.textContent?.trim();
      const blockCount = stack.querySelectorAll('.block').length;
      
      if (placeLabelText === labelToLookFor && blockCount > 0) {
        const containerInfo = { container, blockCount, containerIndex };
        if (!container1Info) {
          container1Info = containerInfo;
        } else if (!container2Info) {
          container2Info = containerInfo;
        }
      }
    });
  });
  
  // Determine drag source (fewer blocks) and drop target (more blocks)
  if (container1Info && container2Info) {
    if (container1Info.blockCount <= container2Info.blockCount) {
      // Container 1 has fewer or equal blocks - it's the drag source
      dragSourceContainer = container1Info.container;
      dropTargetContainer = container2Info.container;
      state.dragSource = container1Info.container;
      state.dropTarget = container2Info.container;
    } else {
      // Container 2 has fewer blocks - it's the drag source  
      dragSourceContainer = container2Info.container;
      dropTargetContainer = container1Info.container;
      state.dragSource = container2Info.container;
      state.dropTarget = container1Info.container;
    }
  } else if (container1Info) {
    // Only one container has blocks - something's wrong, but set it as source
    dragSourceContainer = container1Info.container;
  }

  // Only work within the identified containers
  const nextPlaceRows = [];
  
  // Highlight drag source (in dragSourceContainer)
  if (dragSourceContainer) {
    const dragSourceStacks = dragSourceContainer.querySelectorAll('.place-value-stack');
    dragSourceStacks.forEach((target, index) => {
      const placeLabel = target.querySelector('.place-stack-label');
      const placeLabelText = placeLabel?.textContent?.trim();
      
      if (placeLabelText === labelToLookFor) {
        // target.classList.add("highlight-place");
        const blocksContainer = target.querySelector('.vertical-block-container');
        if (blocksContainer) {
          blocksContainer.classList.add('highlight-place');
        }
        dragSourceRow = { target, index };
        const blockCount = target.querySelectorAll('.block').length;
        nextPlaceRows.push({ target, blockCount, index });
      } else {
        target.classList.add("dim-place");
      }
    });
  }
  
  // Highlight drop target (in dropTargetContainer)
  if (dropTargetContainer) {
    const dropTargetStacks = dropTargetContainer.querySelectorAll('.place-value-stack');
    dropTargetStacks.forEach((target, index) => {
      const placeLabel = target.querySelector('.place-stack-label');
      const placeLabelText = placeLabel?.textContent?.trim();
      
      // Drop target should be the same place value as the drag source
      if (placeLabelText === labelToLookFor) {
        target.classList.add("valid-drop-target");
        const blocksContainer = target.querySelector('.vertical-block-container');
        if (blocksContainer) {
          blocksContainer.classList.add('drop-zone');
        }
        dropTargetRow = { target, index };
        const blockCount = target.querySelectorAll('.block').length;
        nextPlaceRows.push({ target, blockCount, index });
      } else {
        target.classList.add("dim-place");
      }
    });
  }
  nextPlaceRows.forEach(row => {
    row.target.querySelectorAll('.block').forEach(block => {
      block.addEventListener('dragend', (e) => {
        const blockPlace = block.getAttribute('data-place');
        if (blockPlace === labelToLookFor) {
          e.dataTransfer.setData('text/plain', 'dragging');
          e.dataTransfer.effectAllowed = 'move';
        } else {
          e.preventDefault();
        }
      });
    })
  })

/**
 * Animate drop target row to show "Drop here" message
 * @param {HTMLElement} dropTarget - The drop target row element
 */
function animateDropTargetWithMessage(dropTarget) {
  if (!dropTarget) return;
  
  // Store original height for restoration
  const originalHeight = dropTarget.style.height || 'auto';
  const originalMinHeight = dropTarget.style.minHeight || 'auto';
  
  // Create drop message element
  const dropMessage = document.createElement('div');
  dropMessage.className = 'drop-here-message';
  dropMessage.textContent = '📥 Drop here';
  dropMessage.style.cssText = `
    position: absolute;
    top: 0%;
    left: 10%;
  
    background: rgba(76, 175, 80, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 14px;
    z-index: 1000;
    pointer-events: none;
    animation: pulse 1.5s infinite;
  `;
  
  // Make drop target container relative for absolute positioning
  const originalPosition = dropTarget.style.position;
  dropTarget.style.position = 'relative';
  
  // Animate height expansion
  dropTarget.style.transition = 'all 0.3s ease-in-out';
  dropTarget.style.minHeight = '80px';
  dropTarget.style.border = '2px dashed #4CAF50';
  dropTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
  
  // Add the drop message
  dropTarget.appendChild(dropMessage);
  
  // Store cleanup function on the element for later use
  dropTarget._cleanupDropAnimation = () => {
    // Remove message
    if (dropMessage && dropMessage.parentNode) {
      dropMessage.parentNode.removeChild(dropMessage);
    }
    
    // Restore original styles
    dropTarget.style.height = originalHeight;
    dropTarget.style.minHeight = originalMinHeight;
    dropTarget.style.position = originalPosition;
    dropTarget.style.border = '';
    dropTarget.style.backgroundColor = '';
    dropTarget.style.transition = '';
    
    // Clean up the cleanup function
    delete dropTarget._cleanupDropAnimation;
  };
}

/**
 * Clean up drop target animation
 * @param {HTMLElement} dropTarget - The drop target row element
 */
function cleanupDropTargetAnimation(dropTarget) {
  if (dropTarget && dropTarget._cleanupDropAnimation) {
    dropTarget._cleanupDropAnimation();
  }
}
 
  groupIfMoreThanTen(nextPlaceRows);
  updateAllRowPlaceValues()
 
  
  if (nextPlaceRows.length >= 2) {
    // Sort by block count - smaller row becomes drag source, larger becomes drop target
    nextPlaceRows.sort((a, b) => a.blockCount - b.blockCount);

    dragSourceRow = nextPlaceRows[0]; // Smaller row (fewer blocks to drag)
    dropTargetRow = nextPlaceRows[1]; // Larger row (drop destination)
    dropTargetRow.target.classList.add("valid-drop-target");

    const dragOverHandler = (e) => e.preventDefault();
    // Create new drag handlers for second phase

    const dragStartHandler = (e) => {
      e.target.classList.add('dragging');
      e.dataTransfer.setData('text/plain', 'dragging');
      e.dataTransfer.effectAllowed = 'move';
      
      // Animate drop target with "Drop here" message
      animateDropTargetWithMessage(dropTargetRow.target);
    };

    const dragEndHandler = (e) => {
      e.target.classList.remove('dragging');
      
      // Clean up drop target animation
      cleanupDropTargetAnimation(dropTargetRow.target);
    };


    dropTargetRow.target.addEventListener('dragover', dragOverHandler);

    // Set up drag handlers ONLY for blocks in the drag source row
    const dragSourceBlocks = dragSourceRow.target.querySelectorAll('.block');
    dragSourceBlocks.forEach(block => {
      // Remove previous event listeners to avoid conflicts
      block.removeEventListener('dragstart', block._dragStartHandler);
      block.removeEventListener('dragend', block._dragEndHandler);

      // Store handlers for later removal
      block._dragStartHandler = dragStartHandler;
      block._dragEndHandler = dragEndHandler;

      //add handlers
      block.addEventListener('dragstart', dragStartHandler);
      block.addEventListener('dragend', dragEndHandler);

    });
    // Remove drag handlers from ALL other blocks to prevent dragging
    const allOtherBlocks = document.querySelectorAll('.block');

    allOtherBlocks.forEach((block, index) => {
      const row = block.closest('.place-value-stack');
      const span = row?.querySelector('span');
      const rowLabel = span?.textContent?.trim();

      // If this block is NOT in the drag source row, remove its drag handlers
      if (row) {
        if (!row.isEqualNode(dragSourceRow.target)) {
          block.draggable = false;
          block.setAttribute('draggable', 'false');
          // Add a visual indicator
          block.style.opacity = '0.7';
          block.style.cursor = 'not-allowed';
        } else {
          block.style.opacity = '1';
          block.style.cursor = 'grab';
          block.setAttribute('draggable', 'true');
        }

      }

    });

  }
  return { drag: dragSourceRow, drop: dropTargetRow }


}


function groupIfMoreThanTen(nextPlaceRows){
   // sometimes there are rows which have 10 blocks and we need to create a new row for the next place
   //
   let groupiften = true;
   let currentTempState = ensureTempStateInitialized();
   nextPlaceRows.forEach(row => {
    const blocks = row.target.querySelectorAll('.block');
    const blockCount = blocks.length;
    if (blockCount >= 10) {
      // Get current place label and determine next place
      const currentPlaceLabel = row.target.querySelector('.place-stack-label').textContent.trim();
      const placeLabels = currentTempState.placeLabels;
      const currentIndex = placeLabels.indexOf(currentPlaceLabel);

      if (currentIndex !== -1 && currentIndex < placeLabels.length - 1) {
        const nextPlaceLabel = placeLabels[currentIndex + 1];
        const nextPlaceValue = Math.pow(10, currentIndex + 1);

        // Find or create the next place row
        const container = row.target.closest('.number-container');
        let nextPlaceRow = null;

        // Look for existing next place row
        const existingRows = container.querySelectorAll('.place-value-stack');
        for (const existingRow of existingRows) {
          const span = existingRow.querySelector('.place-stack-label');
          if (span && span.textContent.trim() === nextPlaceLabel) {
            nextPlaceRow = existingRow;
            break;
          }
        }
       
          
          let {_,addedRow} = createBlockInPlace(nextPlaceLabel, nextPlaceValue);
         
          // delete the row
          // remove the placelabels
          updateLegendAfterBlockRemoval(row.target, currentPlaceLabel, 10, 0);
          row.target.remove();
          updateHigherPlaceRow(addedRow,state,groupiften=true)
          
        
      }
    }
  })

          

       

    
}

// Set up second phase regrouping - drag the new block to the next place
function setupSecondPhaseRegrouping(state, step, nextPlace) {

  const { drag, drop } = setUpDragDropRows(state,nextPlace);
  // Set up drop handler ONLY for the specific drop target row

  const dropHandler = (e) => {
    e.preventDefault();
    handleSecondPhaseComplete(state, step, nextPlace);

  };
  //sometimes when we regroup,we remove the the whole row,which may throw error
  //  when we try to access dropevent.target so we move next place label to higher value
  try{
  const blockRow = drop.target.querySelector('.block-row');
  blockRow.addEventListener('drop', dropHandler);
  }catch(e){
    let currentTempState = ensureTempStateInitialized();
    nextPlace = currentTempState.placeLabels[currentTempState.currentStepIndex+1];
    
  }
  // Prevent all blocks from being valid drop targets
  //as the child of containers also are valid drop targets
  blockAllBlocksFromBeingDropTargets(".block");
  blockAllBlocksFromBeingDropTargets("span");

}


// Prevent all blocks from being valid drop targets
function blockAllBlocksFromBeingDropTargets(target) {
  const allBlocks = document.querySelectorAll(target);
  allBlocks.forEach(block => {
    // Remove any existing drop event listeners
    block.removeEventListener('drop', handleBlockDrop);
    block.removeEventListener('dragover', handleBlockDragOver);
    
    // Add event listeners to prevent drops on blocks
    block.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Don't allow drop on blocks - redirect to parent
      return false;
    });
    
    block.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Redirect drop to the parent block-row
      const blockRow = block.closest('.block-row');
      if (blockRow) {
        // Dispatch a new drop event on the block-row
        const newEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: e.dataTransfer
        });
        blockRow.dispatchEvent(newEvent);
      }
      return false;
    });
  });
}

// Placeholder functions for removed event listeners
function handleBlockDrop(e) {
  // This function exists to avoid errors when removing event listeners
}

function handleBlockDragOver(e) {
  // This function exists to avoid errors when removing event listeners
}

// Handle completion of second phase regrouping
function handleSecondPhaseComplete(state, step, nextPlace) {


  // Clear highlighting
  document.querySelectorAll('.valid-drop-target').forEach(el => {
    el.classList.remove('valid-drop-target');
  });


}

// Update higher place row block counts after automatic regrouping
//need to pass group if ten to bypass nextplace check as the performauto group 
//already moves to next place
function updateHigherPlaceRow(dropTarget, state, groupiften=false) {
  console.log('🔄 Updating higher place row block counts after regrouping');

  // Get the current drop target's place 
  const currentParentRow = dropTarget.closest('.number-container');
  if (!currentParentRow) {
    console.error('❌ Could not find parent number container');
    return;
  }
  
  const currentRow = currentParentRow.querySelector('.place-value-stack');
  if (!currentRow) {
    console.error('❌ Could not find place-value-stack in parent container');
    return;
  }
  
  const currentLabel = currentRow.querySelector('.place-stack-label');
  if (!currentLabel) {
    console.error('❌ Could not find place-stack-label in current row');
    return;
  }
  
  const currentPlaceLabel = currentLabel.textContent.trim();

  console.log('Current place label:', currentPlaceLabel);

  // Define place value hierarchy
  const placeOrder = state.placeLabels;
  const currentIndex = placeOrder.indexOf(currentPlaceLabel);
  const nextPlaceLabel = groupiften ? placeOrder[currentIndex] : placeOrder[currentIndex + 1];

  if (nextPlaceLabel) {
    let createPlaceLabel = true; // Start with true, set to false if found
    const placeLabel = currentParentRow.querySelectorAll('.legend-item');
    placeLabel.forEach(label => {
      const placeLabelTextAvailable = label ? label.textContent.includes(nextPlaceLabel) : false;
      if (placeLabelTextAvailable) {
        createPlaceLabel = false; // Found it, so don't create
      }
    });
    if(createPlaceLabel){
        // create one since the numbers just regrouped
        const legendContainer = currentParentRow.querySelector('.place-value-legend')
        const newLegendItem = document.createElement('span');
        newLegendItem.className = 'legend-item';
        const colorSpan = document.createElement('span');
        colorSpan.className = 'legend-color blue';
        // legendContainer.appendChild(colorSpan);
        newLegendItem.textContent = `1 x ${nextPlaceLabel} = 1 (${nextPlaceLabel})`;
        legendContainer.appendChild(newLegendItem);
        return;
    }
    

  }

  console.log('Next place label to update:', nextPlaceLabel);
  // Look for the higher place row within the same container
  const allRows = currentParentRow.querySelectorAll('.place-value-stack');
  let higherPlaceRow = null;

  allRows.forEach(row => {
    const label = row.querySelector('.place-stack-label');
    if (label && label.textContent.trim() === nextPlaceLabel) {
      higherPlaceRow = row;
    }
  });

  if (higherPlaceRow) {
    console.log('✅ Found higher place row, updating block counts...');

    // Update the block counts using the same logic as updateRowPlaceValue but more detailed
    updateHigherPlaceBlockCounts(higherPlaceRow, nextPlaceLabel);


    console.log(`✅ Updated ${nextPlaceLabel} row block counts`);
  } else {
    console.log(`⚠️ Higher place row (${nextPlaceLabel}) not found in container`);
  }
}

// More elaborate block count update for higher place rows
function updateHigherPlaceBlockCounts(rowWrapper, placeLabel) {
  let total = 0;
  const counts = {};
  const blockDetails = [];

  console.log(`🔢 Updating block counts for ${placeLabel} row`);

  // Count all blocks in this row
  const allBlocks = rowWrapper.querySelectorAll('.block');
  console.log(`Found ${allBlocks.length} blocks in ${placeLabel} row`);

  allBlocks.forEach((block, index) => {
    const val = parseInt(block.textContent.trim(), 10);
    if (!isNaN(val)) {
      total += val;
      counts[val] = (counts[val] || 0) + 1;
      blockDetails.push({
        index: index,
        value: val,
        element: block
      });
      console.log(`Block ${index + 1}: value = ${val}`);
    }
  });

  // Update the place-value-legend to reflect current block counts
  const numberContainer = rowWrapper.closest('.number-container');
  const legend = numberContainer?.querySelector('.place-value-legend');
  
  if (legend) {
    // Find the legend item for this place value
    const legendItems = legend.querySelectorAll('.legend-item');
    let targetLegendItem = null;
    
    legendItems.forEach(item => {
      if (item.textContent.includes(`(${placeLabel})`)) {
        targetLegendItem = item;
      }
    });
    
    if (targetLegendItem) {
      // Build the breakdown for this place value
      const breakdown = Object.entries(counts)
        .sort((a, b) => b[0] - a[0]) // sort high to low place values
        .map(([val, count]) => {
          val = parseInt(val);
          const totalValue = val * count;
          return `${count} × ${val} = ${totalValue}`;
        }).join(', ');
      
     
      
      
      // Get the color from the existing legend item
      const colorSpan = targetLegendItem.querySelector('.legend-color');
      const colorClass = colorSpan ? colorSpan.className.split(' ').find(c => c !== 'legend-color') : 'blue';
      
      // Update the legend item
      const previousText = targetLegendItem.innerHTML;
      targetLegendItem.innerHTML = `<span class="legend-color ${colorClass}"></span>${breakdown} (${placeLabel})`;
      
      console.log(`📊 ${placeLabel} legend updated: ${breakdown}`);
      console.log(`📊 Total value in ${placeLabel}: ${total}`);
      
      // Log the change for debugging
      if (previousText !== targetLegendItem.innerHTML) {
        console.log(`🔄 ${placeLabel} legend changed`);
      }
    }
    
    
  }
  
  // Update tempState to reflect the current block counts
  updateTempStateFromBlocks();

  // Additional logging for state tracking
  console.log(`📈 ${placeLabel} summary:`, {
    totalBlocks: allBlocks.length,
    totalValue: total,
    blockCounts: counts,
    blockDetails: blockDetails
  });

  return {
    total,
    counts,
    blockDetails,
    breakdown: `Updated legend for ${placeLabel}`
  };
}

// Move to the next step
function moveToNextStep(state) {
  console.log('🔄 moveToNextStep called');
  
  // Update step details with final numbers
  const currentTempState = ensureTempStateInitialized();
  if (currentTempState.stepDetails && currentTempState.stepDetails.length > 0) {
    const currentStepIndex = currentTempState.currentStepIndex;
    updateStepDetails(currentStepIndex, {
      afterNumbers: {
        num1: currentTempState.num1,
        num2: currentTempState.num2
      }
    });
    
  }
  

  
  currentTempState.currentStepIndex++;
  console.log('📈 Moving to step', currentTempState.currentStepIndex);
  processNextCarryStep(state);
}

// Show success feedback for a step
function showStepSuccess(step, inputValue) {
  const qa = document.getElementById("question-area");
  const successMsg = document.createElement('div');
  successMsg.className = 'success-message';
  successMsg.innerHTML = `
    <h3>✅ Correct!</h3>
    <p>${step.digit1} + ${step.digit2}${step.carryIn > 0 ? ` + ${step.carryIn}` : ''} = ${inputValue}</p>
    <p>Moving to next step...</p>
  `;
  qa.appendChild(successMsg);
}

// Show error feedback for a step
function showStepError(step, inputValue, correctAnswer) {
  const qa = document.getElementById("question-area");
  const errorMsg = document.createElement('div');
  errorMsg.className = 'error-message';
  errorMsg.innerHTML = `
    <h3>❌ Not quite right</h3>
    <p>You entered ${inputValue}, but ${step.digit1} + ${step.digit2}${step.carryIn > 0 ? ` + ${step.carryIn}` : ''} = ${correctAnswer}</p>
    <p>Try again!</p>
  `;
  qa.appendChild(errorMsg);

  // Remove error message after 2 seconds
  setTimeout(() => {
    if (errorMsg.parentNode) {
      errorMsg.parentNode.removeChild(errorMsg);
    }
  }, 2000);
}



// Show completion message when all carry-over steps are done
function showCarryOverCompletion() {
  // Hide all floating UI elements
  hideFloatingInfoPanel();
  hideNumpadOverlay();
  hideInstructionsButton();
  
  // get visual area
  const va = document.getElementById("visual-area");
  va.innerHTML = '';

  const completionMsg = document.createElement('div');
  completionMsg.className = 'completion-message';
  completionMsg.innerHTML = `
    <h3>🎉 Carry-Over Complete!</h3>
    <p>Great job! You've successfully completed all the carry-over steps.</p>
    <p>The addition is now complete!</p>
  `;
  va.appendChild(completionMsg);
}



function updateRowPlaceValue(rowWrapper) {
  let total = 0;
  const counts = {};

  // Count loose .block elements (like carry blocks)
  const looseBlocks = rowWrapper.querySelectorAll('.block');
  looseBlocks.forEach(block => {
    const val = parseInt(block.textContent.trim(), 10);
    if (!isNaN(val)) {
      total += val;
      counts[val] = (counts[val] || 0) + 1;
    }
  });

  // Get the place label for this row
  const placeLabel = rowWrapper.querySelector('.place-stack-label');
  const placeLabelText = placeLabel ? placeLabel.textContent.trim() : 'Unknown';
  
  // Update the place-value-legend to reflect current block counts
  const numberContainer = rowWrapper.closest('.number-container');
  const legend = numberContainer?.querySelector('.place-value-legend');
  
  if (legend && Object.keys(counts).length > 0) {
    // Find the legend item for this place value
    const legendItems = legend.querySelectorAll('.legend-item');
    let targetLegendItem = null;
    
    legendItems.forEach(item => {
      if (item.textContent.includes(`(${placeLabelText})`)) {
        targetLegendItem = item;
      }
    });
    
    if (targetLegendItem) {
      // Build the breakdown for this place value
      const breakdown = Object.entries(counts)
        .sort((a, b) => b[0] - a[0]) // sort high to low place values
        .map(([val, count]) => {
          val = parseInt(val);
          const totalValue = val * count;
          return `${count} × ${val} = ${totalValue}`;
        }).join(', ');
      
      // Get the color from the existing legend item
      const colorSpan = targetLegendItem.querySelector('.legend-color');
      const colorClass = colorSpan ? colorSpan.className.split(' ').find(c => c !== 'legend-color') : 'blue';
      
      // Update the legend item
      targetLegendItem.innerHTML = `<span class="legend-color ${colorClass}"></span>${breakdown} (${placeLabelText})`;
      
      console.log(`📊 Updated ${placeLabelText} legend: ${breakdown}`);
    }
  }

  return total;
}

// Function to calculate current value of a number based on its blocks
function calculateNumberFromBlocks(numberContainer) {
  let total = 0;
  console.log(`🧮 Calculating number from blocks in container:`, numberContainer);
  
  // Use the correct DOM structure: .place-value-stack -> .vertical-block-container -> .block
  const placeStacks = numberContainer.querySelectorAll('.place-value-stack');
  console.log(`📦 Found ${placeStacks.length} place stacks`);

  placeStacks.forEach((stack, stackIndex) => {
    const blockContainer = stack.querySelector('.vertical-block-container');
    if (blockContainer) {
      const blocks = blockContainer.querySelectorAll('.block');
      console.log(`📦 Stack ${stackIndex}: Found ${blocks.length} blocks`);
      
      blocks.forEach(block => {
        const val = parseInt(block.textContent.trim(), 10);
        if (!isNaN(val)) {
          total += val;
          console.log(`➕ Adding block value: ${val}, running total: ${total}`);
        }
      });
    }
  });

  console.log(`🎯 Final calculated total: ${total}`);
  return total;
}


// Modal functions for step explanations and dialogs
function showModal(title, content, onOk = null) {
  showModalWithNavigation(title, content, onOk);
}

function hideModal(modalOverlay) {
  modalOverlay.classList.remove('show');
  setTimeout(() => {
    if (modalOverlay.parentNode) {
      modalOverlay.parentNode.removeChild(modalOverlay);
    }
  }, 300);
}

function showStepExplanationModal(step, onNext) {
  const currentTempState = ensureTempStateInitialized();
  
  // Get original numbers from the global state or step data
  const originalNum1 = state.originalNum1
  const originalNum2 = state.originalNum2
  
  // Build comprehensive explanation content
  const title = `🎯 Interactive Carry-Over Addition: ${originalNum1} + ${originalNum2}`;
  
  let content = `
    <div class="comprehensive-explanation">
      <h4>📚 Complete Step-by-Step Process:</h4>
      
      <!-- Enhanced Step Details Section -->
      <div class="step-details-section">
        <h5>🔍 Detailed Step Information:</h5>
        <div class="step-details-list">`;
  
  // Add detailed step information if available
  if (currentTempState.stepDetails && currentTempState.stepDetails.length > 0) {
    currentTempState.stepDetails.forEach((stepDetail, index) => {
      content += `
        <div class="step-detail-item">
          <div class="step-header">
            <h6>🔢 Step ${index + 1}: ${stepDetail.placeLabel} Place (${stepDetail.actionType})</h6>
            
          </div>
          
          <div class="number-transformation">
            <div class="before-after">
              <span class="before">Before: ${stepDetail.beforeNumbers.num1} + ${stepDetail.beforeNumbers.num2}</span>
              
            </div>
          </div>`;
      
      // Show dragged blocks if any
      if (stepDetail.draggedBlocks && stepDetail.draggedBlocks.length > 0) {
        content += `
          <div class="dragged-blocks">
            <strong>👆 Blocks Dragged:</strong>
            <ul>`;
        stepDetail.draggedBlocks.forEach(block => {
          content += `<li>Block "${block.value}" from ${block.fromPlace} (${block.fromNumber}) to ${block.toPlace} (${block.toNumber})</li>`;
        });
        content += `</ul>
          </div>`;
      }
      
      // Show carried blocks if any
      if (stepDetail.carriedBlocks > 0) {
        content += `
          <div class="carried-blocks">
            <strong>🔄 Regrouping Details:</strong>
            <ul>
              <li>Regrouped 10 ${stepDetail.regroupingDetails?.fromPlace} blocks to 1 ${stepDetail.regroupingDetails?.toPlace} block</li>
              
            </ul>
            
          </div>
          <div>${stepDetail.afterNumbers.num1 ? `<span class="after">After: ${stepDetail.afterNumbers.num1} + ${stepDetail.afterNumbers.num2}</span>` : '<span class="pending">In Progress...</span>'}</div>`;
      }
      
      content += `</div>`; // Close step-detail-item
    });
  } else {
    content += `<p class="no-details">No detailed step information available yet.</p>`;
  }
  
  content += `
        </div>
      </div>
     
      <div class="step-explanations">
        <h5>💡 Step Explanations:</h5>
        <div class="explanations-list">`;
  
  // Add step explanations if available
  if (step.explanations && step.explanations.length > 0) {
    step.explanations.forEach((explanation, index) => {
      content += `<p class="explanation-item">• ${explanation}</p>`;
    });
  } else {
    // Fallback explanation based on step data
    if (step.sum >= 10) {
      content += `
        <p class="explanation-item">• Adding ${step.digit1} + ${step.digit2} = ${step.sum}</p>
        <p class="explanation-item">• Since ${step.sum} ≥ 10, we need to regroup!</p>
        <p class="explanation-item">• Keep ${step.sum % 10} in ${step.placeLabel} place, carry ${Math.floor(step.sum / 10)} to next place</p>
      `;
    } else {
      content += `
        <p class="explanation-item">• Adding ${step.digit1} + ${step.digit2} = ${step.sum}</p>
        <p class="explanation-item">• Since ${step.sum} < 10, no regrouping needed</p>
        <p class="explanation-item">• Simply place ${step.sum} in the ${step.placeLabel} place</p>
      `;
    }
  }

  
  showModal(title, content, onNext);
}

// Simplified completion handler - no separate "next step" modal
function handleStepCompletion(message, onNext) {
  // Just call the next step directly without showing a separate modal
  if (onNext) {
    onNext();
  }
}

// Update all row place values and remove empty rows
function updateAllRowPlaceValues() {
  const allRowWrappers = document.querySelectorAll('.place-value-stack');
  let removedCount = 0;
  let updatedCount = 0;
  
  allRowWrappers.forEach(rowWrapper => {
    const blocks = rowWrapper.querySelectorAll('.block');
    
    if (blocks.length === 0) {
    
      //Also remove the legend related to block
      const parentContainer = document.querySelectorAll('.number-container');
      parentContainer.forEach(container => {
        const legends = container.querySelectorAll('.legend-item');
        const placeLabel = rowWrapper.querySelector('.place-stack-label').textContent;
        legends.forEach(legend => {
          if (legend.textContent.includes(placeLabel)) {
            legend.remove();
          }
        });
      });
      rowWrapper.remove();
      removedCount++;
    } else {
      // Update place value for rows that have blocks
      updateRowPlaceValue(rowWrapper);
      updatedCount++;
    }
  });
  
  console.log(`Updated ${updatedCount} rows, removed ${removedCount} empty rows`);
}

// Update current number displays
function updateCurrentNumbers() {
  const numberContainers = document.querySelectorAll('.number-container');
  
  numberContainers.forEach((container, index) => {
    const currentNumber = calculateNumberFromBlocks(container);
    const header = container.querySelector('h4');
    
    if (header) {
      const isFirstNumber = index === 0;
      
      header.textContent = `${currentNumber}`;
      header.classList.add('updated');
      
      // Remove animation class after animation
      setTimeout(() => {
        header.classList.remove('updated');
      }, 500);
    }
  });
}

// Store explanation for navigation
function storeExplanation(title, content) {
  const currentTempState = ensureTempStateInitialized();
  if(!currentTempState.explanations){
    currentTempState.explanations = [];
  }
  
  const explanation = {
    id: currentTempState.explanations.length,
    title: title,
    content: content,
    timestamp: new Date().toLocaleTimeString()
  };
  
  currentTempState.explanations.push(explanation);
}

// Enhanced step tracking system
function initializeStepTracking() {
  const currentTempState = ensureTempStateInitialized();
  if (!currentTempState.stepDetails) {
    currentTempState.stepDetails = [];
  }
}

// Track detailed step information
function trackStepDetails(stepInfo) {
  const currentTempState = ensureTempStateInitialized();
  initializeStepTracking();
  
  const stepDetail = {
    stepIndex: currentTempState.currentStepIndex,
    placeLabel: stepInfo.placeLabel,
    timestamp: new Date().toLocaleTimeString(),
    beforeNumbers: {
      num1: stepInfo.beforeNum1 || currentTempState.num1,
      num2: stepInfo.beforeNum2 || currentTempState.num2
    },
    afterNumbers: {
      num1: null, // Will be updated after step completion
      num2: null
    },
    draggedBlocks: [],
    carriedBlocks: 0,
    regroupingDetails: null,
    actionType: stepInfo.actionType || 'unknown' // 'drag-drop', 'numpad', 'auto-regroup'
  };
  
  currentTempState.stepDetails.push(stepDetail);
  return stepDetail;
}

// Update step details after completion
function updateStepDetails(stepIndex, updates) {
  const currentTempState = ensureTempStateInitialized();
  if (currentTempState.stepDetails && currentTempState.stepDetails[stepIndex]) {
    Object.assign(currentTempState.stepDetails[stepIndex], updates);
  }
}

// Track dragged blocks
function trackDraggedBlock(blockInfo) {
  const currentTempState = ensureTempStateInitialized();
  const currentStepIndex = currentTempState.currentStepIndex;
  
  if (currentTempState.stepDetails && currentTempState.stepDetails[currentStepIndex]) {
    currentTempState.stepDetails[currentStepIndex].draggedBlocks.push({
      value: blockInfo.value,
      fromPlace: blockInfo.fromPlace,
      toPlace: blockInfo.toPlace,
      fromNumber: blockInfo.fromNumber,
      toNumber: blockInfo.toNumber,
      timestamp: new Date().toLocaleTimeString()
    });
  }
}

// Track carried blocks during regrouping
function trackCarriedBlocks(carryInfo) {
  const currentTempState = ensureTempStateInitialized();
  const currentStepIndex = currentTempState.currentStepIndex;
  
  if (currentTempState.stepDetails && currentTempState.stepDetails[currentStepIndex]) {
    currentTempState.stepDetails[currentStepIndex].carriedBlocks = carryInfo.amount;
    currentTempState.stepDetails[currentStepIndex].regroupingDetails = {
      blocksRemoved: carryInfo.blocksRemoved,
      blocksAdded: carryInfo.blocksAdded,
      fromPlace: carryInfo.fromPlace,
      toPlace: carryInfo.toPlace
    };
  }
}

// Show steps modal triggered by the "Show Steps" button
function showStepsModal() {
  if (window.currentStepForModal) {
    showStepExplanationModal(window.currentStepForModal, null);
  } else {
    // Fallback if no current step is stored
    showModal('📚 Steps Information', '<p>No step information available at this time.</p>');
  }
}

// Make showStepsModal globally accessible
window.showStepsModal = showStepsModal;

// Enhanced modal with navigation and touch support
function showModalWithNavigation(title, content, onOk = null) {
  // this function also creates temp state with explanations
  
  const currentTempState = ensureTempStateInitialized();
  storeExplanation(title, content);
  
  
  
  const currentIndex = currentTempState.explanations.length - 1;
  const hasMultiple = currentTempState.explanations.length > 1;
  
  let currentExplanationIndex = currentIndex;
  
  function renderModal() {
    const explanation = currentTempState.explanations[currentExplanationIndex];
    const isFirst = currentExplanationIndex === 0;
    const isLast = currentExplanationIndex === currentTempState.explanations.length - 1;
    
    // Remove existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay show';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content touch-enabled';
    
    const navigationHtml = hasMultiple ? `
      <div class="explanation-navigation">
        <button class="nav-btn prev-btn" ${isFirst ? 'disabled' : ''} 
                onclick="navigateExplanation(-1)" 
                ontouchstart="handleTouchStart(event, -1)">
          ← Previous
        </button>
        <span class="nav-counter">${currentExplanationIndex + 1} of ${currentTempState.explanations.length}</span>
        <button class="nav-btn next-btn" ${isLast ? 'disabled' : ''} 
                onclick="navigateExplanation(1)" 
                ontouchstart="handleTouchStart(event, 1)">
          Next →
        </button>
      </div>
    ` : '';
    
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>${explanation.title}</h3>
        ${navigationHtml}
      </div>
      <div class="modal-body touch-scrollable">
        ${explanation.content}
      </div>
      <div class="modal-footer">
        <button class="modal-ok-btn touch-btn" onclick="closeModalWithNavigation()" 
                ontouchstart="handleTouchStart(event, 'ok')">
          OK
        </button>
      </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add touch gesture support
    addSwipeGestures(modalContent);
    
    // Focus management for accessibility
    const okButton = modalContent.querySelector('.modal-ok-btn');
    if (okButton) {
      okButton.focus();
    }
  }
  
  // Navigation functions
  window.navigateExplanation = (direction) => {
    currentExplanationIndex += direction;
    if (currentExplanationIndex < 0) currentExplanationIndex = 0;
    if (currentExplanationIndex >= currentTempState.explanations.length) {
      currentExplanationIndex = currentTempState.explanations.length - 1;
    }
    renderModal();
  };
  
  window.closeModalWithNavigation = () => {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      hideModal(modal);
    }
    // Clean up global functions
    delete window.navigateExplanation;
    delete window.closeModalWithNavigation;
    delete window.handleTouchStart;
    
    if (onOk) {
      onOk();
    }
  };
  
  // Touch event handlers
  window.ontouchstart = (event, action) => {
    event.preventDefault();
    
    if (action === 'ok') {
      window.closeModalWithNavigation();
    } else if (typeof action === 'number') {
      window.navigateExplanation(action);
    }
  };
  
  renderModal();
}

// Add swipe gesture support for tablet navigation
function addSwipeGestures(element) {
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;
  
  element.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  
  element.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - go to previous
        if (window.navigateExplanation) {
          window.navigateExplanation(-1);
        }
      } else {
        // Swipe left - go to next
        if (window.navigateExplanation) {
          window.navigateExplanation(1);
        }
      }
    }
  }, { passive: true });
}

// ============================================================================
// FLOATING UI ELEMENTS FUNCTIONALITY
// ============================================================================

/**
 * Show the floating information panel with current place label
 * @param {string} placeLabel - The place value being worked on (e.g., "Ones", "Tens")
 */
function showFloatingInfoPanel(placeLabel) {
    const panel = document.getElementById('floating-info-panel');
    const labelElement = document.getElementById('current-place-label');
    
    if (panel && labelElement) {
        labelElement.textContent = placeLabel;
        panel.style.display = 'block';
        
        // Add a subtle animation reset
        panel.style.animation = 'none';
        setTimeout(() => {
            panel.style.animation = 'slideInFromRight 0.5s ease-out';
        }, 10);
    }
}

/**
 * Hide the floating information panel
 */
function hideFloatingInfoPanel() {
    const panel = document.getElementById('floating-info-panel');
    if (panel) {
        panel.style.display = 'none';
    }
}

/**
 * Show the numpad overlay to indicate blocks are not operable
 */
function showNumpadOverlay() {
    const overlay = document.getElementById('numpad-overlay');
    const visualArea = document.getElementById('visual-area');
    
    if (overlay && visualArea) {
        // Position overlay only over the visual area
        visualArea.style.position = 'relative';
        visualArea.appendChild(overlay);
        overlay.style.display = 'flex';
        
        // Disable all block interactions
        disableBlockInteractions();
    }
}

/**
 * Hide the numpad overlay and re-enable block interactions
 */
function hideNumpadOverlay() {
    const overlay = document.getElementById('numpad-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        
        // Move overlay back to its original position in the DOM
        const originalParent = document.body;
        if (overlay.parentNode !== originalParent) {
            originalParent.appendChild(overlay);
        }
        
        // Re-enable block interactions if not in a step that requires them disabled
        enableBlockInteractions();
    }
}

/**
 * Disable all block interactions (drag, drop, hover effects)
 */
function disableBlockInteractions() {
    const blocks = document.querySelectorAll('.block');
    const visualArea = document.getElementById('visual-area');
    
    blocks.forEach(block => {
        block.style.pointerEvents = 'none';
        block.style.opacity = '0.6';
        block.style.cursor = 'not-allowed';
    });
    
    if (visualArea) {
        visualArea.classList.add('blocks-disabled');
    }
}

/**
 * Enable all block interactions
 */
function enableBlockInteractions() {
    const blocks = document.querySelectorAll('.block');
    const visualArea = document.getElementById('visual-area');
    
    blocks.forEach(block => {
        block.style.pointerEvents = 'auto';
        block.style.opacity = '1';
        block.style.cursor = 'grab';
    });
    
    if (visualArea) {
        visualArea.classList.remove('blocks-disabled');
    }
}

/**
 * Show the instructions button
 */
function showInstructionsButton() {
    const button = document.getElementById('instructions-button');
    if (button) {
        button.style.display = 'block';
    }
}

/**
 * Hide the instructions button
 */
function hideInstructionsButton() {
    const button = document.getElementById('instructions-button');
    if (button) {
        button.style.display = 'none';
    }
}


// ============================================================================
// VERTICALLY SLIDING INSTRUCTIONS FUNCTIONALITY
// ============================================================================

/**
 * Initialize the vertically sliding instructions functionality
 * Sets up event listeners and manages instructions state
 */
function initializeInstructionsSlider() {
  const container = document.getElementById('instructions-container');
  const handle = document.getElementById('instructions-handle');
  
  if (!container || !handle) {
    console.warn('Instructions slider elements not found');
    return;
  }

  // Initialize as collapsed
  container.classList.remove('expanded', 'force-visible');
  
  // Handle click events on the instructions handle
  handle.addEventListener('click', toggleInstructions);
  
  // Store instructions state
  window.instructionsState = {
    isExpanded: false,
    isForceVisible: false
  };
}

/**
 * Toggle the instructions between expanded and collapsed states
 */
function toggleInstructions() {
  const container = document.getElementById('instructions-container');
  if (!container) return;
  
  const isCurrentlyExpanded = container.classList.contains('expanded');
  
  if (isCurrentlyExpanded) {
    collapseInstructions();
  } else {
    expandInstructions();
  }
}

/**
 * Expand the instructions to show content
 */
function expandInstructions() {
  const container = document.getElementById('instructions-container');
  if (!container) return;
  
  container.classList.add('expanded');
  window.instructionsState.isExpanded = true;
  
  // Update arrow direction
  updateInstructionsArrow(true);
}

/**
 * Collapse the instructions to hide content
 */
function collapseInstructions() {
  const container = document.getElementById('instructions-container');
  if (!container) return;
  
  // Don't collapse if force visible is set
  if (window.instructionsState.isForceVisible) {
    return;
  }
  
  container.classList.remove('expanded');
  window.instructionsState.isExpanded = false;
  
  // Update arrow direction
  updateInstructionsArrow(false);
}

/**
 * Force the instructions to be visible (used during important steps)
 * @param {boolean} forceVisible - Whether to force visibility
 */
function setInstructionsForceVisible(forceVisible) {
  const container = document.getElementById('instructions-container');
  if (!container) return;
  
  window.instructionsState.isForceVisible = forceVisible;
  
  if (forceVisible) {
    container.classList.add('force-visible');
    container.classList.add('expanded');
    updateInstructionsArrow(true);
  } else {
    container.classList.remove('force-visible');
    // Only collapse if user hasn't manually expanded it
    if (!window.instructionsState.isExpanded) {
      collapseInstructions();
    }
  }
}

/**
 * Update the arrow direction in the instructions handle
 * @param {boolean} isExpanded - Whether the instructions are expanded
 */
function updateInstructionsArrow(isExpanded) {
  const arrow = document.querySelector('.handle-arrow');
  if (!arrow) return;
  
  // Arrow points up when expanded, down when collapsed
  arrow.innerHTML = isExpanded ? '<span>&#9664;</span>' : '<span>&#9654;</span>';
}

/**
 * Show content in the instructions area
 * @param {string} content - HTML content to display
 * @param {boolean} forceVisible - Whether to force the instructions visible
 */
function showInstructions(content, forceVisible = false) {
  const questionArea = document.getElementById('question-area');
  if (!questionArea) return;
  
  questionArea.innerHTML = content;
  
  if (forceVisible) {
    setInstructionsForceVisible(true);
  } else {
    // Just expand if not force visible
    expandInstructions();
  }
}

/**
 * Hide the instructions content and collapse it
 */
function hideInstructions() {
  const questionArea = document.getElementById('question-area');
  if (questionArea) {
    questionArea.innerHTML = '';
  }
  
  setInstructionsForceVisible(false);
  collapseInstructions();
}

// Initialize instructions slider and floating UI when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeInstructionsSlider();
    
  });
} else {
  initializeInstructionsSlider();
  
}

// Make instructions functions globally accessible
window.toggleInstructions = toggleInstructions;
window.expandInstructions = expandInstructions;
window.collapseInstructions = collapseInstructions;
window.setInstructionsForceVisible = setInstructionsForceVisible;
window.showInstructions = showInstructions;
window.hideInstructions = hideInstructions;
