import {ensureTempStateInitialized} from './carryoverLogic.js';
/**
 * Paper-Style Addition Modal JavaScript
 * Handles the traditional paper addition visualization with animations
 */

let paperAdditionState = {
  num1:0,
  num2:0,
  originalNum1: 0,
  originalNum2: 0,
  currentStep: 0,
  totalSteps: 0,
  steps: [],
  placeValues: [],
  placeLabels: [],
  
  
};
/**
 * Sync placeValues and placeLabels from tempState to paperAdditionState
 * so the paper addition modal can use the correct place values and labels
 */
function ensureSyncedTempState() {
  const currentTempState = ensureTempStateInitialized();
  paperAdditionState.placeValues = currentTempState.placeValues;
  paperAdditionState.placeLabels = currentTempState.placeLabels;
  paperAdditionState.originalNum1 = currentTempState.num1;
  paperAdditionState.originalNum2 = currentTempState.num2;
  paperAdditionState.num1 = currentTempState.num1;
  paperAdditionState.num2 = currentTempState.num2;
  return currentTempState;
}

/**
 * Initialize and show the paper addition modal
 */
async function showPaperAdditionModal(num1, num2, currentPlaceLabel = null) {
  console.log('📝 Showing paper addition modal:', num1, '+', num2);
  
  // Load modal HTML if not already loaded
  await loadModalHTML();
  
  // Calculate steps only if needed (cache for same numbers)
  let calculatedSteps;
  const needsStepsCalculation = !paperAdditionState || 
                               !paperAdditionState.steps ||
                               paperAdditionState.num1 !== num1 || 
                               paperAdditionState.num2 !== num2;
  
  if (needsStepsCalculation) {
    console.log('🧮 Calculating steps for new numbers:', num1, '+', num2);
    calculatedSteps = calculateAdditionSteps(num1, num2);
  } else {
    console.log('♻️ Reusing cached steps for:', num1, '+', num2);
    calculatedSteps = paperAdditionState.steps;
  }
  
  console.log('📊 Using steps:', calculatedSteps);
  
  
  // Show the modal
  const modal = document.getElementById('paper-addition-modal');
  if (modal) {
    // Only set up the table if it hasn't been set up for these numbers yet
    const needsSetup = !paperAdditionState.lastSetupNumbers || 
                      paperAdditionState.lastSetupNumbers.num1 !== num1 || 
                      paperAdditionState.lastSetupNumbers.num2 !== num2;
    
    if (needsSetup) {
      console.log('🏗️ Setting up table for new numbers:', num1, '+', num2);
      setupGridAddition(num1, num2);
      paperAdditionState.lastSetupNumbers = { num1, num2 };
     
    } else {
      console.log('♻️ Reusing existing table setup for:', num1, '+', num2);
      
    }
    
    modal.style.display = 'flex';
    
    // If a specific place is provided, the sync will be handled by updatePaperAdditionProgress
    // No need to sync here as it would be duplicate
    if (!currentPlaceLabel) {
      // Show initial state only if no specific place is provided
      updateStepDisplay();
    }
  }
}

/**
 * Load the modal HTML from paperAddition.html
 */
async function loadModalHTML() {
  // Check if modal already exists
  if (document.getElementById('paper-addition-modal')) {
    return;
  }
  
  try {
    const response = await fetch('paperAddition.html');
    const html = await response.text();
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Find the modal in the loaded HTML
    const modal = tempDiv.querySelector('#paper-addition-modal');
    if (modal) {
      // Append the modal to the body
      document.body.appendChild(modal);
      console.log('✅ Modal HTML loaded successfully');
    } else {
      console.error('❌ Modal not found in paperAddition.html');
    }
  } catch (error) {
    console.error('❌ Failed to load modal HTML:', error);
  }
}

/**
 * Calculate all the steps needed for the addition process
 */
function calculateAdditionSteps(num1, num2) {
  ensureSyncedTempState();
  const steps = [];
  const num1Str = num1.toString();
  const num2Str = num2.toString();
  
  // Determine the maximum length for zero-padding
  const maxLength = Math.max(num1Str.length, num2Str.length);
  
  // Pad numbers with zeros
  const paddedNum1 = num1Str.padStart(maxLength, '0');
  const paddedNum2 = num2Str.padStart(maxLength, '0');
  
  let carry = 0;
  let result = '';
  
  // Process each place value from right to left
  for (let i = maxLength - 1; i >= 0; i--) {
    const digit1 = parseInt(paddedNum1[i]);
    const digit2 = parseInt(paddedNum2[i]);
    const sum = digit1 + digit2 + carry;
    const resultDigit = sum % 10;
    const newCarry = Math.floor(sum / 10);
    
    const placeIndex = maxLength - 1 - i;
    const placeLabels = paperAdditionState.placeLabels;
    const placeLabel = placeLabels[placeIndex];
    
    steps.push({
      placeIndex: placeIndex,
      placeLabel: placeLabel,
      digit1: digit1,
      digit2: digit2,
      previousCarry: carry,
      sum: sum,
      resultDigit: resultDigit,
      newCarry: newCarry,
      operation: `${digit1} + ${digit2}${carry > 0 ? ` + ${carry}` : ''} = ${sum}`,
      explanation: newCarry > 0 
        ? `${placeLabel}: ${digit1} + ${digit2}${carry > 0 ? ` + ${carry}` : ''} = ${sum}. Write ${resultDigit}, carry ${newCarry}.`
        : `${placeLabel}: ${digit1} + ${digit2}${carry > 0 ? ` + ${carry}` : ''} = ${sum}.`
    });
    
    result = resultDigit + result;
    carry = newCarry;
  }
  
  // Handle final carry if exists
  if (carry > 0) {
    steps.push({
      placeIndex: maxLength,
      placeLabel: paperAdditionState.placeLabels[maxLength],
      digit1: 0,
      digit2: 0,
      previousCarry: carry,
      sum: carry,
      resultDigit: carry,
      newCarry: 0,
      operation: `Carry ${carry}`,
      explanation: `Final carry: ${carry}`
    });
    result = carry + result;
  }
  
  paperAdditionState.steps = steps;
  paperAdditionState.totalSteps = steps.length;
  return paperAdditionState.steps;
}
function resetPaperAdditionState(){
    paperAdditionState = {
        num1: 0,
        num2: 0,
        originalNum1: 0,
        originalNum2: 0,
        digitLevel: 2,
        currentPlaceIndex: 3,
        placeLabels: [], // Fixed: index 0 = Ones, 1 = Tens, etc.
        placeValues: [], // Fixed: index 0 = 1, 1 = 10, etc.
        mode: 'carry',
        carryPlaces: [],
        currentCarryIndex: null,
        usedPlaces: [],
        currentStepIndex:0,
        currentStep:0
    }
    const currentTempState = ensureTempStateInitialized();
    paperAdditionState.placeValues = currentTempState.placeValues;
    paperAdditionState.placeLabels = currentTempState.placeLabels;
    paperAdditionState.currentStep=0;
}


/**
 * Set up the simple table display using steps data
 */
function setupGridAddition(num1, num2) {
  console.log('🏗️ Setting up simple table from steps:', num1, '+', num2);
  
  // Use the steps to determine what digits to show
  const steps = paperAdditionState.steps;
  if (!steps || steps.length === 0) {
    console.error('❌ No steps available for table setup');
    return;
  }
  
  // Set up table rows using steps data
  setupSimpleCarryRow(steps);
  setupSimpleNumberRow('first-number-row', steps, 'digit1');
  setupSimpleNumberRow('second-number-row', steps, 'digit2', true); // true for plus sign
  setupSimpleNumberRow('result-number-row', steps, 'result', false, true); // true for hidden initially
}

/**
 * Set up carry row using steps data
 */
function setupSimpleCarryRow(steps) {
  const carryRow = document.getElementById('carry-row');
  if (!carryRow) return;
  
  carryRow.innerHTML = '';
  
  // Create cells for each step (right to left, so reverse)
//make one extra so that tables look aligned,instead of steps.length-1,go through steps.length
  for (let i = steps.length; i >= 0; i--) {
    const step = steps[i];
    const carryCell = document.createElement('td');
    carryCell.className = 'carry-cell';
    if(step){
      carryCell.setAttribute('data-place', step.placeLabel);
    }
    else{
      carryCell.setAttribute('data-place', "null");
    }
    
    carryRow.appendChild(carryCell);
  }
}

/**
 * Set up number row using steps data
 */
function setupSimpleNumberRow(rowId, steps, digitType, includePlusSign = false, hidden = false) {
  const row = document.getElementById(rowId);
  if (!row) return;
  
  row.innerHTML = '';
  
  // Add plus sign for second number row
  if (includePlusSign) {
    const plusCell = document.createElement('td');
    plusCell.className = 'plus-sign-cell';
    plusCell.textContent = '+';
    row.appendChild(plusCell);
  }
  else{
    //random td so that table is aligned
    const emptyCell = document.createElement('td');
    emptyCell.className = 'empty-cell';
    row.appendChild(emptyCell);
  }
  
  // Create cells for each step (right to left, so reverse)
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    const digitCell = document.createElement('td');
    digitCell.className = 'digit-cell';
    digitCell.setAttribute('data-place', step.placeLabel.toLowerCase());
    
    // Set the digit based on type
    if (digitType === 'digit1') {
      digitCell.textContent = step.digit1;
    } else if (digitType === 'digit2') {
      digitCell.textContent = step.digit2;
    } else if (digitType === 'result') {
      digitCell.textContent = ''; // Start empty, will be filled by sync
      if (hidden) {
        digitCell.style.opacity = '0';
      }
    }
    
    row.appendChild(digitCell);
  }
}


/*
 * Sync the paper addition to a specific place label
 */
function syncToPlaceLabel(placeLabel) {
  // Check if steps are available
  if (!paperAdditionState || !paperAdditionState.steps || !Array.isArray(paperAdditionState.steps)) {
    console.warn('❌ Cannot sync to place label: steps not available');
    return;
  }
  
  // Find the step that corresponds to this place label
  const stepIndex = paperAdditionState.steps.findIndex(step => 
    step.placeLabel.toLowerCase() === placeLabel.toLowerCase()
  );
  
  // Only proceed if we found a valid step
  if (stepIndex >= 0) {
    const targetStep = stepIndex+1; // Convert to 1-based step number
    
    // Only update if we're moving to a new step
    if (paperAdditionState.currentStep !== targetStep) {
      paperAdditionState.currentStep = targetStep;
      
      // Show results up to this step (without clearing and replaying)
      showResultsUpToStep(targetStep);
      updateStepDisplay();
    }
  }
}

/**
 * Show results up to a specific step using grid-based positioning
 */
function showResultsUpToStep(targetStep) {
  console.log('🎯 Showing results up to step:', targetStep);
  
  // Check if table structure exists
  const additionTable = document.getElementById('addition-table');
  if (!additionTable) {
    console.log('Table structure not ready yet, skipping result update');
    return;
  }
  
  // Clear existing carries
  const carryRow = document.getElementById('carry-row');
  // if (carryRow) {
  //   const carryCells = carryRow.querySelectorAll('.carry-cell');
  //   carryCells.forEach(cell => {
  //     cell.textContent = '';
  //     cell.classList.remove('show');
  //   });
  // }
  
  // Show result only for the current step (not all previous steps)
  if (targetStep > 0 && targetStep <= paperAdditionState.steps.length) {
    const currentStep = paperAdditionState.steps[targetStep - 1]; // targetStep is 1-indexed
    
    // Show result digit for current step only
    showResultDigit(currentStep.placeLabel, currentStep.resultDigit);
    
    // Show carry for current step if needed
    if (currentStep.newCarry > 0) {
      showCarryInGrid(currentStep.placeLabel, currentStep.newCarry);
    }
    
    console.log(`✅ Showing result for step ${targetStep}: ${currentStep.placeLabel} = ${currentStep.resultDigit}`);
  }
}

/**
 * Show a result digit in the table using data attributes
 */
function showResultDigit(placeLabel, digit) {
  // Check if result row exists
  const resultRow = document.getElementById('result-number-row');
  if (!resultRow) {
    console.warn(`❌ Result row not found!`);
    return;
  }
  
  // Find the specific cell for this place
  const resultCell = resultRow.querySelector(`.digit-cell[data-place="${placeLabel.toLowerCase()}"]`);
  if (resultCell) {
    resultCell.textContent = digit;
    resultCell.style.opacity = '1';
    resultCell.classList.add('show');
    console.log(`✅ Showed result digit ${digit} for ${placeLabel} place`);
  } else {
    console.warn(`❌ Could not find result cell for ${placeLabel} place`);
  }
}

/**
 * Show a carry number in the grid using data attributes
 */
function showCarryInGrid(fromPlace, carryValue) {
  
  const targetPlace = getNextPlace(paperAdditionState, fromPlace);
  if (!targetPlace) {
    console.warn(`❌ No target place found for carry from ${fromPlace}`);
    return;
  }
  
  const carryCell = document.querySelector(`.carry-cell[data-place="${targetPlace}"]`);
  if (carryCell) {
    carryCell.textContent = carryValue;
    carryCell.classList.add('show');
    console.log(`✅ Showed carry ${carryValue} in ${targetPlace} place`);
  } else {
    console.warn(`❌ Could not find carry cell for ${targetPlace} place`);
  }
}



/**
 * Get the next higher place value for carry operations
 */
function getNextPlace(currentTempState,currentPlace) {
  const placeOrder = currentTempState.placeLabels;
  const currentIndex = placeOrder.indexOf(currentPlace);
  return currentIndex >= 0 && currentIndex < placeOrder.length - 1 ? placeOrder[currentIndex + 1] : null;
}



/**
 * Update the paper addition to show progress up to current place
 */
function updatePaperAdditionProgress(placeLabel) {
  const modal = document.getElementById('paper-addition-modal');
  if (modal && modal.style.display === 'flex') {
    syncToPlaceLabel(placeLabel);
  } else {
    console.log('Paper addition modal not visible, skipping progress update for:', placeLabel);
  }
}



/**
 * Show carry animation
 */
function showCarryAnimation(carryValue, toPlaceIndex) {
  const carryContainer = document.getElementById('carry-container');
  const carryElement = document.createElement('div');
  carryElement.className = 'carry-number';
  carryElement.textContent = carryValue;
  
  // Position the carry number above the target place using CSS custom property
  const maxLength = Math.max(paperAdditionState.originalNum1.toString().length, 
                            paperAdditionState.originalNum2.toString().length);
  const digitPosition = maxLength - toPlaceIndex;
  
  if (digitPosition >= 0) {
    carryElement.style.setProperty('--digit-position', digitPosition);
    carryElement.style.top = '10px';
    
    carryContainer.appendChild(carryElement);
  }
}


/**
 * Update the step display and explanation
 */
function updateStepDisplay() {
  const explanation = document.getElementById('step-explanation');
  
  // Only update explanation if it exists
  if (explanation) {
    if (paperAdditionState.currentStep === 0) {
      explanation.innerHTML = '<p>Paper addition will sync automatically with your block manipulation progress!</p>';
    } else {
      // Build accumulated explanations for all completed steps
      let allExplanations = '<div class="all-explanations">';
      
      for (let i = 0; i < paperAdditionState.currentStep && i < paperAdditionState.steps.length; i++) {
        const step = paperAdditionState.steps[i];
        allExplanations += `
          <div class="step-explanation-item">
            <h4>🔢 ${step.placeLabel} Place:</h4>
            <p><span class="operation">${step.operation}</span></p>
            <p class="explanation-text">${step.explanation}</p>
          </div>
        `;
      }
      
      allExplanations += '</div>';
      
      if (paperAdditionState.currentStep >= paperAdditionState.totalSteps) {
        // Addition is complete - show completion message and set up close button
        allExplanations += '<div class="completion-message">🎉 Addition complete!</div>';
        const paperHeader = document.querySelector(".paper-header h3")
        if(paperHeader){
          paperHeader.innerHTML = '<div class="completion-message">🎉 Addition complete!</div>';
          resetPaperAdditionState();
          const state = ensureSyncedTempState();
          if(state){
            // dont show paper button
            state.paperProgress = false;
          }
        }
        
      } else {
        // Addition is in progress - show current step
        document.querySelector(".paper-header h3").innerHTML = `<h3>Solving at ${paperAdditionState.steps[paperAdditionState.currentStep-1].placeLabel} place</h3>`;
      }
      
      // Set explanation content for both cases
      explanation.innerHTML = allExplanations;
    }
  }
}

/**
 * Close the paper addition modal
 */
function closePaperAdditionModal() {
  const modal = document.getElementById('paper-addition-modal');
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

/**
 * Integration function to be called from the main carry-over logic
 */
async function showPaperAdditionFromCarryOver(state, currentPlaceLabel = null) {
  if (state && state.originalNum1 && state.originalNum2) {
    await showPaperAdditionModal(state.originalNum1, state.originalNum2, currentPlaceLabel);
  }
}

/**
 * Create a floating paper addition button where state is available
 */
function createFloatingPaperButton(state) {
  // Remove existing button if it exists
  if(state.paperProgress){
    const existingBtn = document.getElementById('floating-paper-btn');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'floating-paper-btn';
    floatingBtn.className = 'floating-paper-button';
    floatingBtn.innerHTML = '📝 Paper Addition';
    floatingBtn.onclick = () => {
      const modalBtn = document.getElementById('paper-addition-modal');
      if(modalBtn){
        modalBtn.style.display = 'flex';
      }
    };
    
    document.body.appendChild(floatingBtn);
  }
}
 

// Export functions for module usage
export {
  showPaperAdditionModal,
  closePaperAdditionModal,
  showPaperAdditionFromCarryOver,
  updatePaperAdditionProgress,
  createFloatingPaperButton,
};

// Make functions globally accessible for HTML onclick handlers
window.showPaperAdditionModal = showPaperAdditionModal;
window.closePaperAdditionModal = closePaperAdditionModal;
window.showPaperAdditionFromCarryOver = showPaperAdditionFromCarryOver;
