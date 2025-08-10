// Enhanced Block Counting Demo - Complete carry-over addition experience
import {
    detectCarryPlaces,
    startInteractiveCarryOver,
    ensureTempStateInitialized,
    resetTempState
} from './carryoverLogic.js';


export var state = {
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
    explanations: []
};

const reInitialiseState = ()=>{
    return {
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
        usedPlaces: []
    }
}



const createPlaceValues = (N1, N2) => {
    state.placeLabels = [];
    state.placeValues = [];
    let sum = N1 + N2;
    let extraPlaceLabelNeeded = false;
    let placevaluestoCalculateFrom;
    if (N1 > N2) {
        placevaluestoCalculateFrom = N1;
    }
    else {
        placevaluestoCalculateFrom = N2;
    }
    // if sum is more than the original number placelabels,we need one extra
    //further in our logic we will use this extraPlaceLabelNeeded to add an extra place label
    let numPlaceValuesLength = placevaluestoCalculateFrom.toString().length;
    if(sum.toString().length>placevaluestoCalculateFrom.toString().length){
        state.extraPlaceLabelNeeded = true;
        
    }
    else{
        state.extraPlaceLabelNeeded = false;
    }
    for (let i = 0; i < numPlaceValuesLength; i++) {
        if (placevaluestoCalculateFrom.toString()[i]) {
            if (i == 0) {
                state.placeLabels.push("Ones");
                let num = Math.pow(10, i);
                state.placeValues.push(num);
            }
            else if (i == 1) {
                state.placeLabels.push("Tens");
                let num = Math.pow(10, i);
                state.placeValues.push(num);
            }
            else if (i == 2) {
                state.placeLabels.push("Hundreds");
                let num = Math.pow(10, i);
                state.placeValues.push(num);
            }
            else if (i == 3) {
                state.placeLabels.push("Thousands");
                let num = Math.pow(10, i);
                state.placeValues.push(num);
            }
            else if (i == 4) {
                state.placeLabels.push("Ten Thousands");
                let num = Math.pow(10, i);
                state.placeValues.push(num);
            }
            else if (i == 5) {
                state.placeLabels.push("Hundred Thousands");
                let num = Math.pow(10, i);
                state.placeValues.push(num);
            }
            else if (i == 6) {
                state.placeLabels.push("Million");
                let num = Math.pow(10, i);
                state.placeValues.push(num);


            }
        }
    }
    let placeLabels = state.placeLabels;    
    let placeValues = state.placeValues;
    return {placeLabels,placeValues}
    
    
}


function generateProblem(type = 'random') {
    let n1, n2;
    
   

    // Create specific examples for testing
    const examples = {
        'no-carry': [[19923, 145]], // No carry-over needed
        'ones-only': [[47, 18]], // Carry in ones place only
        'tens-only': [[150, 60], [240, 70], [130, 80]], // Tens carry (5+6=11, 4+7=11, 3+8=11)
        'both-carry': [[96, 24]], // Carry in both ones and tens
        'random': [[96, 24], [87, 45], [156, 78], [234, 189], [67, 58], [149, 76]],
        "testExample": [[996,114]]
    };


    // [[87, 45], [96, 24], [67, 58]], // Carry in both ones and tens

    const selectedExamples = examples[type] || examples['random'];
    const randomExample = selectedExamples[Math.floor(Math.random() * selectedExamples.length)];
    [n1, n2] = randomExample;
    state = reInitialiseState();
    
    // Reset tempState in carryoverLogic to sync with new problem
    resetTempState();

    state.num1 = n1;
    state.num2 = n2;
    state.originalNum1 = n1;
    state.originalNum2 = n2;

    // Used places
    const maxDigits = Math.max(
        state.num1.toString().length,
        state.num2.toString().length
    );

    const usedPlaces = Array.from({ length: maxDigits }, (_, i) => i).filter(i => {
        return getDigit(state.num1, i) >= 0 || getDigit(state.num2, i) >= 0;
    });

    state.usedPlaces = usedPlaces;
    // Start from the lowest used place (ones place)
    state.currentPlaceIndex = Math.min(...usedPlaces);

    // Detect carry-over columns
    state.carryPlaces = detectCarryPlaces(n1, n2);
    state.currentCarryIndex = state.carryPlaces.length > 0 ? state.carryPlaces[0] : null;

    render(state);
}

function render(state) {
    const refrenceValues = ["Ones","Tens","Hundreds","Thousands","Ten Thousands",
                                    "Hundred Thousands","Million"];
    const {placeLabels,placeValues} = createPlaceValues(state.num1, state.num2);
    if(state.extraPlaceLabelNeeded){
        let placeLabelsLength = state.placeLabels.length;
        state.placeValues.push(Math.pow(10,placeLabelsLength));
        state.placeLabels.push(refrenceValues[placeLabelsLength]);
       
    }
    const calTitle = document.getElementById("question-title");
    calTitle.innerHTML = `<h2>🎯 Let's add ${state.num1} and ${state.num2}</h2>`;

    const visualArea = document.getElementById("visual-area");
    const sumBox = document.getElementById("sum-blocks");
    const qa = document.getElementById("question-area");
    const sumArea = document.getElementById("sum-area");
    sumArea.classList.remove('show-completion');

    visualArea.innerHTML = '';
    sumBox.innerHTML = '';
    qa.innerHTML = `<div class="prompt-box"><h3>🚀 Get ready to solve: ${state.num1} + ${state.num2}</h3></div>`;

    // Create side-by-side container for numbers
    const numbersContainer = document.createElement('div');
    numbersContainer.className = 'numbers-side-by-side';

    // Get current numbers (use tempState if available, otherwise original)
    const tempStateData = ensureTempStateInitialized();
    const currentNum1 = tempStateData.num1 || state.num1;
    const currentNum2 = tempStateData.num2 || state.num2;
    
    // First Number
    const num1Container = document.createElement('div');
    num1Container.className = 'number-container';
    num1Container.id = 'num1-container';
    num1Container.innerHTML = `<h4 id="num1-header"> ${currentNum1} </h4>`;
    num1Container.appendChild(renderBlockStack(currentNum1, 'blue', state.usedPlaces));
    numbersContainer.appendChild(num1Container);

    // Second Number
    const num2Container = document.createElement('div');
    num2Container.className = 'number-container';
    num2Container.id = 'num2-container';
    num2Container.innerHTML = `<h4 id="num2-header">${currentNum2}</h4>`;
    num2Container.appendChild(renderBlockStack(currentNum2, 'green', state.usedPlaces));
    numbersContainer.appendChild(num2Container);

    visualArea.appendChild(numbersContainer);

    // Horizontal line
    const hr = document.createElement('hr');
    hr.style.border = '3px dashed #007bff';
    hr.style.margin = '30px 0';
   

    
}

function renderBlockStack(num, color, usedPlaces) {
    const stack = document.createElement('div');
    stack.className = 'block-stack-horizontal';

    // Create horizontal container for place value stacks
    const placeStacksContainer = document.createElement('div');
    placeStacksContainer.className = 'place-stacks-container';

    usedPlaces.forEach(placeIndex => {
        const count = getDigit(num, placeIndex);
        if (count === 0) return;

        const label = state.placeLabels[placeIndex];
        const valuePerBlock = state.placeValues[placeIndex];

        // Create vertical stack for this place value
        const placeStack = document.createElement('div');
        placeStack.className = 'place-value-stack';
        
        // Add place label
        const placeLabel = document.createElement('div');
        placeLabel.className = 'place-stack-label';
        placeLabel.textContent = label;
        placeStack.appendChild(placeLabel);
        
        // Create vertical container for blocks
        const verticalBlockContainer = document.createElement('div');
        verticalBlockContainer.className = 'vertical-block-container';

        // Add blocks vertically for this place value
        for (let i = 0; i < count; i++) {
            const block = document.createElement('div');
            block.className = `block ${color} ${label.toLowerCase()}`;
            block.textContent = valuePerBlock;
            block.draggable = true;
            block.setAttribute('data-place', label);
            block.setAttribute('data-value', valuePerBlock);

            // Add drag event listeners
            block.addEventListener('dragstart', (e) => {
                block.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    place: label,
                    value: valuePerBlock
                }));
            });

            block.addEventListener('dragend', () => {
                block.classList.remove('dragging');
            });

            verticalBlockContainer.appendChild(block);
        }
        
        placeStack.appendChild(verticalBlockContainer);
        placeStacksContainer.appendChild(placeStack);
    });

    // Add place value legend
    const legend = document.createElement('div');
    legend.className = 'place-value-legend';
    usedPlaces.forEach(placeIndex => {
        const count = getDigit(num, placeIndex);
        if (count === 0) return;
        
        const label = state.placeLabels[placeIndex];
        const valuePerBlock = state.placeValues[placeIndex];
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `<span class="legend-color ${color}"></span>${count} × ${valuePerBlock} = ${count * valuePerBlock} (${label})`;
        legend.appendChild(legendItem);
    });

    stack.appendChild(legend);
    stack.appendChild(placeStacksContainer);
    return stack;
}

function getDigit(num, index) {
    return Math.floor(num / Math.pow(10, index)) % 10;
}





export function showCompletion() {
    // Show the sum blocks area at completion
    const sumArea = document.getElementById('sum-area');
    sumArea.classList.add('show-completion');
    // First, animate all remaining blocks to sum row
    animateAllBlocksToSumRow(() => {
        // Then show completion message and summary
        const visualArea = document.getElementById("visual-area");

        // SIMPLIFIED: Just use basic math for final sum
        const originalNum1 = state.originalNum1 || state.num1;
        const originalNum2 = state.originalNum2 || state.num2;
        const correctSum = originalNum1 + originalNum2;

        // Create final sum display
        const finalSumDiv = document.createElement('div');
        finalSumDiv.className = 'final-sum-display';
        finalSumDiv.innerHTML = `<h2>🎉 Final Answer: ${correctSum} 🎉</h2>`;
        finalSumDiv.style.opacity = '0';
        finalSumDiv.style.transform = 'scale(0.8)';

        const va = document.getElementById("visual-area");
        const qa = document.getElementById("question-area");
        va.innerHTML = '';

        // Add completion message
        const completionMsg = document.createElement('div');
        completionMsg.className = 'completion-container';
        completionMsg.innerHTML = `
            <h3 class="complete-msg">🎉 Excellent Work! 🎉</h3>
            <p>You successfully added ${originalNum1} + ${originalNum2} = ${correctSum}</p>
        `;
        qa.innerHTML = '';
        qa.innerHTML= 
        ` <p class="complete">All Steps Completed</p> `

        va.appendChild(completionMsg);
        va.appendChild(finalSumDiv);
        va.style.flexDirection = 'column';
        va.style.alignItems = 'center';
        va.style.justifyContent = 'center';

        // // Show visual summary if there were carry operations
        // if (state.carryPlaces && state.carryPlaces.length > 0) {
        //     showCarryOverSummary();
        // }

        // Animate final sum appearing
        setTimeout(() => {
            finalSumDiv.style.transition = 'all 0.6s ease-out';
            finalSumDiv.style.opacity = '1';
            finalSumDiv.style.transform = 'scale(1)';
        }, 500);

        // Add next problem button
        // Create button container for multiple buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "completion-buttons";
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 20px;
        `;

        // Try Another Problem button
        const nextBtn = document.createElement("button");
        nextBtn.className = "next-btn";
        nextBtn.textContent = "🚀 Try Another Problem";
        nextBtn.onclick = () => {
            state = reInitialiseState();
            generateProblem();
            startInteractiveCarryOver(state);
        };

        // Try in MathPad button
        const mathPadBtn = document.createElement("button");
        mathPadBtn.className = "mathpad-btn";
        mathPadBtn.textContent = "✏️ Try in MathPad";
        mathPadBtn.style.cssText = `
            background: linear-gradient(45deg, #2196F3, #1976D2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
        `;
        mathPadBtn.onmouseover = () => {
            mathPadBtn.style.transform = 'translateY(-2px)';
            mathPadBtn.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.4)';
        };
        mathPadBtn.onmouseout = () => {
            mathPadBtn.style.transform = 'translateY(0)';
            mathPadBtn.style.boxShadow = '0 4px 15px rgba(33, 150, 243, 0.3)';
        };
        mathPadBtn.onclick = () => {
            // Pass the current problem to MathPad via URL parameters
            const mathPadUrl = `../MathPad/index.html?num1=${state.originalNum1}&num2=${state.originalNum2}&source=blockDemo`;
            window.open(mathPadUrl, '_blank');
        };

        // Back to Hub button
        const hubBtn = document.createElement("button");
        hubBtn.className = "hub-btn";
        hubBtn.textContent = "🏠 Back to Hub";
        hubBtn.style.cssText = `
            background: linear-gradient(45deg, #FF9800, #F57C00);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
        `;
        hubBtn.onmouseover = () => {
            hubBtn.style.transform = 'translateY(-2px)';
            hubBtn.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.4)';
        };
        hubBtn.onmouseout = () => {
            hubBtn.style.transform = 'translateY(0)';
            hubBtn.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.3)';
        };
        hubBtn.onclick = () => {
            window.location.href = '../index.html';
        };

        // Add buttons to container
        buttonContainer.appendChild(nextBtn);
        buttonContainer.appendChild(mathPadBtn);
        buttonContainer.appendChild(hubBtn);

        setTimeout(() => {
            va.appendChild(buttonContainer);
            buttonContainer.style.opacity = '0';
            buttonContainer.style.transform = 'translateY(20px)';
            setTimeout(() => {
                buttonContainer.style.transition = 'all 0.4s ease-out';
                buttonContainer.style.opacity = '1';
                buttonContainer.style.transform = 'translateY(0)';
            }, 100);
        }, 1000);
    });
}

// Function to animate all remaining blocks to sum row
function animateAllBlocksToSumRow(onComplete) {
    const numberContainers = document.querySelectorAll('.number-container');
    const sumBox = document.getElementById('sum-blocks');
    let animationsCompleted = 0;
    let totalAnimations = 0;
    
    // Count total blocks to animate
    numberContainers.forEach(container => {
        const blocks = container.querySelectorAll('.block');
        totalAnimations += blocks.length;
    });

    if (totalAnimations === 0) {
        onComplete();
        return;
    }

    // Get sum box position once
    const sumRect = sumBox.getBoundingClientRect();
    
    // Animate each block
    numberContainers.forEach((container, containerIndex) => {
        const blocks = container.querySelectorAll('.block');
        
        blocks.forEach((block, blockIndex) => {
            const initialDelay = (containerIndex * 200) + (blockIndex * 100);
            
            // Get original block position
            const blockRect = block.getBoundingClientRect();
            
            // Create clone for animation
            const blockClone = block.cloneNode(true);
            blockClone.className = 'block sum final-block';
            
            // Position clone at original block position (fixed positioning)
            blockClone.style.position = 'fixed';
            blockClone.style.left = blockRect.left + 'px';
            blockClone.style.top = blockRect.top + 'px';
            blockClone.style.zIndex = '1000';
            blockClone.style.pointerEvents = 'none';
            blockClone.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Add clone to document body for animation
            document.body.appendChild(blockClone);
            
            // Hide original block immediately
            block.style.opacity = '0';
            
            // Start animation after delay
            setTimeout(() => {
                // Calculate grid position in sum box
                const col = animationsCompleted % 10;
                const row = Math.floor(animationsCompleted / 10);
                
                // Animate to sum position
                blockClone.style.left = (sumRect.left + col * 45) + 'px';
                blockClone.style.top = (sumRect.top + 35 + row * 45) + 'px';
                blockClone.style.transform = 'scale(0.8)';
                
                // After animation completes
                setTimeout(() => {
                    // Remove the animated clone
                    blockClone.remove();
                    
                    // Create final block in sum box
                    const finalBlock = document.createElement('div');
                    finalBlock.className = 'block sum final-block';
                    finalBlock.textContent = block.textContent;
                    finalBlock.style.position = 'relative';
                    finalBlock.style.display = 'inline-block';
                    finalBlock.style.margin = '2px';
                    
                    sumBox.appendChild(finalBlock);
                    
                    animationsCompleted++;
                    
                    // Check if all animations are complete
                    if (animationsCompleted === totalAnimations) {
                        // Remove number containers after animation
                        numberContainers.forEach(container => {
                            container.style.transition = 'all 0.5s ease-out';
                            container.style.opacity = '0';
                            container.style.transform = 'translateY(-20px)';
                            setTimeout(() => container.remove(), 500);
                        });
                        
                        setTimeout(onComplete, 1000);
                    }
                }, 800); // Animation duration
            }, initialDelay);
        });
    });
}


// Initialize the demo
document.addEventListener("DOMContentLoaded", () => {
    // Add welcome message
    const qa = document.getElementById("question-area");
    qa.innerHTML = `
        <div class="prompt-box">
            <h3>🎓 Welcome to Interactive Block Counting!</h3>
            <p>This demo will show you how to solve carry-over addition problems step by step.</p>
            <p>Watch the numbers update as you drag blocks, and see beautiful animations!</p>
        </div>
    `;

    // Demo button event handlers - moved inside DOMContentLoaded
    document.getElementById('random-btn').addEventListener('click', () => {
        state = reInitialiseState();
        
        generateProblem('random');
        
        startInteractiveCarryOver(state);
    });

    document.getElementById('no-carry-btn').addEventListener('click', () => {
        state = reInitialiseState();
            generateProblem('no-carry');
        
        startInteractiveCarryOver(state);
    });
    
    document.getElementById('ones-carry-btn').addEventListener('click', () => {
        state = reInitialiseState();
        generateProblem('ones-only');
        
        startInteractiveCarryOver(state);
    });

    document.getElementById('tens-carry-btn').addEventListener('click', () => {
        state = reInitialiseState();
        generateProblem('tens-only');
        
        startInteractiveCarryOver(state);
    });

    document.getElementById('both-carry-btn').addEventListener('click', () => {
        state = reInitialiseState();
        generateProblem('both-carry');
        
        startInteractiveCarryOver(state);
    });
   

    

    
});


