// Lightweight ONNX alphabet loader/predictor used by the client-side fallback.
// Matches server-side preprocessing exactly (calc_landmark_list + pre_process_landmark).

import * as ort from 'onnxruntime-web';

async function resolveExistingUrl(candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const u of list) {
    try {
      const res = await fetch(u, { method: 'HEAD' });
      if (res.ok) return u;
    } catch {}
  }
  return null;
}

// Configure WASM for onnxruntime-web
if (typeof window !== 'undefined') {
  try {
    // Configure WASM backend - use CDN for WASM binaries
    // onnxruntime-web will automatically load WASM files from the CDN
    ort.env.wasm.numThreads = Math.min(4, navigator?.hardwareConcurrency || 2);
    
    // Set WASM paths - try unpkg first (more reliable for npm packages)
    // The library will automatically append the correct WASM file names
    // Format: wasmPaths should be a string pointing to the directory containing WASM files
    ort.env.wasm.wasmPaths = 'https://unpkg.com/onnxruntime-web@1.23.2/dist/';
    
    console.log('✅ ONNX WASM configured:', {
      numThreads: ort.env.wasm.numThreads,
      wasmPaths: ort.env.wasm.wasmPaths
    });
  } catch (e) {
    console.warn('⚠️ Could not configure ONNX WASM:', e);
  }
}

let cachedSession = null;
let cachedMetadata = null;
let cachedModelUrl = null;

// ISL Alphabet mapping - EXACT copy from server-side code
// Order: ['0','1','2','3','4','5','6','7','8','9'] + list(string.ascii_uppercase)
const DIGITS = Array.from({ length: 10 }, (_, i) => String(i));
const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const ISL_ALPHABET = [...DIGITS, ...LETTERS]; // 36 classes: 0-9, A-Z

function inferDefaultLabels(length) {
  // Use ISL alphabet if output size matches (36 classes)
  if (length === 36) {
    return ISL_ALPHABET;
  }
  if (length === 37) {
    return [...ISL_ALPHABET, 'Space'];
  }
  if (length === 38) {
    return [...ISL_ALPHABET, 'Space', 'Delete'];
  }
  // For other sizes, still try to use ISL alphabet if it's close
  if (length > 36 && length < 50) {
    console.warn(`⚠️ Unexpected output size ${length}, using ISL alphabet (36 classes)`);
    return ISL_ALPHABET;
  }
  return Array.from({ length }, (_, idx) => `Class ${idx}`);
}

/**
 * Convert normalized landmarks (0-1) to pixel coordinates
 * EXACT copy from server-side calc_landmark_list (lines 63-70)
 */
function calcLandmarkListPx(normalizedLandmarks, imageWidth, imageHeight) {
  // EXACT copy from Python isl_detection.py calc_landmark_list (lines 63-70)
  // Python: landmark_x = min(int(landmark.x * image_width), image_width - 1)
  // int() truncates (like Math.floor() for positive numbers)
  const landmarkPoint = [];
  for (let i = 0; i < normalizedLandmarks.length; i += 2) {
    if (i + 1 < normalizedLandmarks.length) {
      const x = Math.min(Math.floor(normalizedLandmarks[i] * imageWidth), imageWidth - 1);
      const y = Math.min(Math.floor(normalizedLandmarks[i + 1] * imageHeight), imageHeight - 1);
      landmarkPoint.push([x, y]);
    }
  }
  return landmarkPoint;
}

/**
 * Preprocess landmarks - EXACT copy from server-side pre_process_landmark (lines 72-88)
 * 1. Convert to relative coordinates (base = first point/wrist)
 * 2. Normalize by max absolute value
 */
function preProcessLandmark(landmarkListPx) {
  // EXACT match Python isl_detection.py pre_process_landmark (lines 72-88)
  // Python line 73: temp_landmark_list = [pt[:] for pt in landmark_list]
  // Shallow copy of 21 [x,y] points (pixel coordinates)
  const tempLandmarkList = landmarkListPx.map(pt => [...pt]);

  // EXACT match Python lines 76-79: Convert to relative (base = first point)
  const baseX = tempLandmarkList[0][0];
  const baseY = tempLandmarkList[0][1];
  for (let i = 0; i < tempLandmarkList.length; i++) {
    tempLandmarkList[i][0] -= baseX;
    tempLandmarkList[i][1] -= baseY;
  }

  // EXACT match Python line 82: flat = list(itertools.chain.from_iterable(temp_landmark_list))
  // Flatten to 42 elements (21 points * 2 coordinates)
  const flat = tempLandmarkList.flat();

  // EXACT match Python lines 85-88: Normalize safely
  const maxValue = Math.max(...flat.map(Math.abs)) || 1.0;
  if (maxValue === 0) {
    // Python line 87: return [0.0] * len(flat)
    return new Array(flat.length).fill(0.0);
  }
  // Python line 88: return [v / max_value for v in flat]
  return flat.map(v => v / maxValue);
}

export async function loadAlphabetOnnxModel(modelUrl = '/onnx_models/isl_model.onnx') {
  if (cachedSession && cachedModelUrl === modelUrl) {
    console.log('✅ Using cached ONNX alphabet model');
    return { session: cachedSession, metadata: cachedMetadata };
  }

  try {
    // Try common fallback paths so dev environments don't fail when file is placed under /public
    const resolvedUrl = await resolveExistingUrl([
      modelUrl,
      '/onnx_models/isl_model.onnx',
      '/isl_model.onnx'
    ]);
    if (!resolvedUrl) {
      throw new Error(`Alphabet ONNX not found. Checked: ${[modelUrl, '/onnx_models/isl_model.onnx', '/isl_model.onnx'].join(', ')}`);
    }
    console.log('🔄 Loading ONNX alphabet model from:', resolvedUrl);
    const session = await ort.InferenceSession.create(resolvedUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });

    // Extract metadata
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const inputInfo = session.modelMetadata?.inputMetadata?.[inputName];
    const outputInfo = session.modelMetadata?.outputMetadata?.[outputName];

    const inputShape = inputInfo?.shape || [1, 42]; // Default for single-frame 42-feature input
    const outputShape = outputInfo?.shape || [1, 36]; // Default for 36-class output
    const featureSize = inputShape[inputShape.length - 1] || 42;
    const sequenceLength = inputShape.length > 1 ? inputShape[1] || 1 : 1;
    const batchSize = inputShape[0] || 1;

    // Infer labels based on output size
    const numClasses = outputShape[outputShape.length - 1] || 36;
    const labels = inferDefaultLabels(numClasses);

    const metadata = {
      inputName,
      inputShape,
      outputName,
      outputShape,
      featureSize,
      sequenceLength,
      batchSize,
      labels,
      numClasses
    };

    console.log('✅ ONNX alphabet model loaded:', {
      inputShape,
      outputShape,
      featureSize,
      sequenceLength,
      numClasses,
      labels: labels.slice(0, 5) + (labels.length > 5 ? '...' : '')
    });

    cachedSession = session;
    cachedMetadata = metadata;
    cachedModelUrl = resolvedUrl;

    return { session, metadata };
  } catch (error) {
    console.error('❌ ONNX alphabet model loading error:', error);
    throw error;
  }
}

/**
 * Build input tensor for alphabet model
 * Expects: single frame of 42 features (or averaged from history)
 * Shape: [1, 42] (default)
 */
function buildInputTensor(frameArray, metadata, imageWidth = 640, imageHeight = 480) {
  if (!Array.isArray(frameArray) || frameArray.length === 0) {
    throw new Error('No frames provided for tensor building');
  }

  const { inputShape, featureSize } = metadata;
  const batchSize = inputShape[0] || 1;
  const sequenceLength = inputShape[1] || 1;

  // For alphabet model: use last frame (or average if multiple)
  let frameData;
  if (frameArray.length === 1) {
    frameData = frameArray[0];
  } else {
    // Average multiple frames for stability (e.g., from landmarkHistory)
    const numFrames = frameArray.length;
    frameData = new Array(featureSize).fill(0);
    for (let f = 0; f < numFrames; f++) {
      const frame = frameArray[f];
      for (let i = 0; i < featureSize; i++) {
        frameData[i] += (frame[i] ?? 0) / numFrames;
      }
    }
  }

  // If raw normalized landmarks (from MediaPipe), preprocess them
  // Assume input is [x1,y1,x2,y2,...] for 21 points (42 values)
  if (frameData.length === 42 && frameData.every(v => v >= 0 && v <= 1)) {
    // Convert to pixel, then preprocess (matching server)
    const landmarkListPx = calcLandmarkListPx(frameData, imageWidth, imageHeight);
    frameData = preProcessLandmark(landmarkListPx);
  }

  // Validate and prepare data
  const data = new Float32Array(featureSize);
  for (let i = 0; i < featureSize; i++) {
    const val = frameData[i] ?? 0;
    data[i] = Number.isFinite(val) ? val : 0;
  }

  // Build tensor shape
  const dims = [];
  let totalElements = 1;
  for (let i = 0; i < inputShape.length; i++) {
    let dim = inputShape[i];
    if (dim === null || dim === -1) { // Dynamic axes
      if (i === 0) {
        dim = batchSize;
      } else if (i === 1) {
        dim = sequenceLength;
      } else {
        dim = featureSize;
      }
    }
    dims.push(dim);
    totalElements *= dim;
  }

  // For single-frame, ensure [1, 42]
  if (dims.length === 1) {
    dims.push(featureSize);
  } else if (dims.length === 2) {
    dims[0] = batchSize;
    dims[1] = featureSize;
  }

  // For sequence models, pad/repeat if needed (but alphabet is single-frame)
  if (dims[1] > 1) {
    // Repeat frame to fill sequence (simple fallback)
    const seqData = new Float32Array(dims[1] * featureSize);
    for (let t = 0; t < dims[1]; t++) {
      seqData.set(data, t * featureSize);
    }
    const tensorData = new Float32Array(dims.reduce((a, b) => a * b, 1));
    tensorData.set(seqData);
    return new ort.Tensor('float32', tensorData, dims);
  }

  console.log(`🔢 Built alphabet tensor: [${dims.join(', ')}]`, {
    first10: Array.from(data).slice(0, 10),
    min: Math.min(...data),
    max: Math.max(...data)
  });

  return new ort.Tensor('float32', data, dims);
}

/**
 * Compute probabilities from model output
 * Based on reference app: model outputs probabilities directly, not logits
 * Reference: const confidence = Math.max(...probs);
 */
function computeProbabilities(output) {
  // Model outputs probabilities directly (not logits)
  // Use the output values as-is, matching reference app behavior
  const probs = Array.from(output);
  
  // Validate output - check for NaN or invalid values
  const hasNaN = probs.some(v => !Number.isFinite(v));
  if (hasNaN) {
    console.error('⚠️ Model output contains NaN or invalid values:', {
      output: probs.slice(0, 10),
      allValid: probs.every(v => Number.isFinite(v))
    });
    // Return safe default
    return { bestIndex: 0, bestProb: 0, probabilities: new Array(probs.length).fill(0) };
  }
  
  let bestIndex = 0;
  let bestProb = probs[0] ?? 0;
  for (let i = 1; i < probs.length; i++) {
    if (Number.isFinite(probs[i]) && probs[i] > bestProb) {
      bestProb = probs[i];
      bestIndex = i;
    }
  }
  return { bestIndex, bestProb, probabilities: probs };
}

export async function predictAlphabet(sessionBundle, frames, options = {}) {
  if (!sessionBundle?.session) {
    throw new Error('ONNX session not provided');
  }
  const frameArray = Array.isArray(frames?.[0]) ? frames : [frames];
  
  // Get image dimensions from options (default to 640x480 matching reference app)
  const imageWidth = options.imageWidth || 640;
  const imageHeight = options.imageHeight || 480;
  
  try {
    // If skipPreprocessing is true, frames are already pre-processed (from history averaging)
    let tensor;
    if (options.skipPreprocessing && frameArray.length > 0 && frameArray[0].length === 42) {
      // Use pre-processed input directly (matching Reference_App.jsx line 119)
      const preProcessed = frameArray[0];
      const dims = [1, 42];
      const data = new Float32Array(42);
      for (let i = 0; i < 42; i++) {
        const val = preProcessed[i] ?? 0;
        // Validate input - replace NaN/Infinity with 0
        data[i] = Number.isFinite(val) ? val : 0;
      }
      
      // Check for all zeros or invalid input
      const hasInvalid = data.some(v => !Number.isFinite(v));
      if (hasInvalid) {
        console.error('⚠️ Pre-processed input contains invalid values:', Array.from(data).slice(0, 10));
      }
      
      tensor = new ort.Tensor('float32', data, dims);
      
      // Debug: Log input tensor values to compare with Python
      const dataArray = Array.from(data);
      console.log(`🔢 Using pre-processed tensor: [${dims.join(', ')}] (skipped preprocessing)`, {
        first10: dataArray.slice(0, 10),
        last10: dataArray.slice(-10),
        min: Math.min(...dataArray),
        max: Math.max(...dataArray),
        mean: dataArray.reduce((a, b) => a + b, 0) / dataArray.length,
        allValid: dataArray.every(v => Number.isFinite(v))
      });
    } else {
      tensor = buildInputTensor(frameArray, sessionBundle.metadata, imageWidth, imageHeight);
    }
    const feeds = { [sessionBundle.metadata.inputName]: tensor };
    
    console.log('🔮 Running ONNX prediction:', {
      inputShape: tensor.dims,
      inputRank: tensor.dims.length,
      expectedShape: sessionBundle.metadata.inputShape,
      expectedRank: sessionBundle.metadata.inputShape.length,
      frameCount: frameArray.length
    });
    
    const results = await sessionBundle.session.run(feeds);
    const outputTensor = results[sessionBundle.metadata.outputName] ?? results[sessionBundle.session.outputNames[0]];
    if (!outputTensor) {
      throw new Error('ONNX model returned no output tensor');
    }

    const output = Array.from(outputTensor.data);
    const { bestIndex, bestProb, probabilities } = computeProbabilities(output);

    // Always use ISL alphabet (36 classes) regardless of output size
    // The model might output more classes, but we only care about the first 36
    const labels = ISL_ALPHABET;
    const maxIndex = Math.min(bestIndex, labels.length - 1);
    const label = labels[maxIndex] ?? `Class ${bestIndex}`;

    // Log prediction details for debugging
    console.log('🎯 ONNX Prediction Result:', {
      outputSize: output.length,
      bestIndex,
      bestLabel: label,
      bestProbability: bestProb,
      top3: probabilities
        .map((p, i) => ({ 
          index: i, 
          label: i < labels.length ? labels[i] : `Class ${i}`, 
          prob: p 
        }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3),
      note: output.length !== 36 ? `⚠️ Output size (${output.length}) doesn't match ISL alphabet (36), using first 36 classes` : '✅ Output size matches ISL alphabet'
    });

    return {
      label,
      probability: bestProb,
      index: bestIndex,
      probabilities,
      rawOutput: output
    };
  } catch (error) {
    console.error('❌ ONNX prediction error:', {
      error: error.message,
      expectedShape: sessionBundle.metadata.inputShape,
      expectedRank: sessionBundle.metadata.inputShape.length,
      frameCount: frameArray.length,
      firstFrameLength: frameArray[0]?.length
    });
    throw error;
  }
}

export function resetCachedAlphabetModel() {
  cachedSession = null;
  cachedMetadata = null;
  cachedModelUrl = null;
}