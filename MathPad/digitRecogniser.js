let model = null;

/**
 * Loads the pre-trained digit recognition model.
 * Call this once before using predictDigit.
 * @param {string} url - Path to the model.json file
 */
export async function loadModel(url = './trained-model.json') {
  if (model) return;  // Prevent re-loading
  try {
    model = await tf.loadLayersModel(url);
    console.log("Model loaded successfully.");
  } catch (error) {
    console.error("Failed to load model:", error);
    console.log("Trying alternative path...");
    // Try with MathPad prefix if the first attempt fails
    try {
      model = await tf.loadLayersModel('./MathPad/trained-model.json');
      console.log("Model loaded with alternative path.");
    } catch (secondError) {
      console.error("Failed to load model with alternative path:", secondError);
      throw new Error("Could not load the digit recognition model. Please check file paths.");
    }
  }
}

/**
 * Predicts a single digit from the provided canvas element.
 * @param {HTMLCanvasElement} canvasElement - The canvas containing the drawn digit
 * @returns {Promise<number>} - The predicted digit (0-9)
 */
export async function predictDigit(canvasElement) {
  if (!model) throw new Error("Model not loaded. Call loadModel() first.");

  const ctx = canvasElement.getContext('2d');
  const fullData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
  const { width, height } = fullData;

  const grayscale = [];
  for (let i = 0; i < fullData.data.length; i += 4) {
    const avg = (fullData.data[i] + fullData.data[i + 1] + fullData.data[i + 2]) / 3;
    const inverted = 255 - avg;
    grayscale.push(inverted / 255);
  }

  const fullTensor = tf.tensor(grayscale, [height, width, 1]).expandDims(0);
  const resized = tf.image.resizeBilinear(fullTensor, [28, 28]);
  const input = resized;

  const prediction = model.predict(input);
  const digit = prediction.argMax(1).dataSync()[0];

  input.dispose();
  resized.dispose();
  fullTensor.dispose();
  prediction.dispose();

  return digit;
}
