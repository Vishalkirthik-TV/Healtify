// LSTM Word Model labels - 15 classes
// Order matches the training: ['actor', 'bed', 'dream', 'dress', 'evening', 'friend', 'goodmorning',
//                              'happy', 'hello', 'howareyou', 'loud', 'pleased', 'thankyou', 'they', 'noaction']
const LSTM_WORD_LABELS = [
  'actor', 'bed', 'dream', 'dress', 'evening', 'friend', 'goodmorning',
  'happy', 'hello', 'howareyou', 'loud', 'pleased', 'thankyou', 'they', 'noaction'
];

// LSTM model expects: (batch_size, sequence_length, features)
// sequence_length = 30 frames
// features = 1662 (pose: 132 + face: 1404 + left_hand: 63 + right_hand: 63)
const LSTM_SEQUENCE_LENGTH = 30;
const LSTM_FEATURE_SIZE = 1662;

// Feature breakdown:
// - Pose: 33 landmarks * 4 (x, y, z, visibility) = 132
// - Face: 468 landmarks * 3 (x, y, z) = 1404
// - Left hand: 21 landmarks * 3 (x, y, z) = 63
// - Right hand: 21 landmarks * 3 (x, y, z) = 63
// Total: 132 + 1404 + 63 + 63 = 1662

let cachedLstmSession = null;
let cachedLstmMetadata = null;
let cachedLstmModelUrl = null;

import * as ort from 'onnxruntime-web';

async function resolveExistingUrl(candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const u of list) {
    try {
      const res = await fetch(u, { method: 'HEAD' });
      if (res.ok) return u;
    } catch { }
  }
  return null;
}

/**
 * Extract keypoints from MediaPipe Holistic results
 * Matches Python extract_keypoints function
 * Returns: [pose(132), face(1404), left_hand(63), right_hand(63)] = 1662 features
 */
export function extractKeypointsForLstm(results) {
  // Pose: 33 landmarks * 4 (x, y, z, visibility)
  const pose = results.poseLandmarks
    ? results.poseLandmarks.flatMap(lm => [lm.x || 0, lm.y || 0, lm.z || 0, lm.visibility || 0])
    : new Array(132).fill(0);

  // Face: 468 landmarks * 3 (x, y, z)
  // Handle refineFaceLandmarks: true (478 points) by slicing to 468
  const faceLandmarks = results.faceLandmarks ? results.faceLandmarks.slice(0, 468) : [];
  const face = faceLandmarks.length > 0
    ? faceLandmarks.flatMap(lm => [lm.x || 0, lm.y || 0, lm.z || 0])
    : new Array(1404).fill(0);

  // Left hand: 21 landmarks * 3 (x, y, z)
  const leftHand = results.leftHandLandmarks
    ? results.leftHandLandmarks.flatMap(lm => [lm.x || 0, lm.y || 0, lm.z || 0])
    : new Array(63).fill(0);

  // Right hand: 21 landmarks * 3 (x, y, z)
  const rightHand = results.rightHandLandmarks
    ? results.rightHandLandmarks.flatMap(lm => [lm.x || 0, lm.y || 0, lm.z || 0])
    : new Array(63).fill(0);

  // Concatenate all features
  return new Float32Array([...pose, ...face, ...leftHand, ...rightHand]);
}

/**
 * Load LSTM ONNX model with caching
 * Expects input shape: [1, 30, 1662]
 * Outputs: [1, 15] (15 word classes)
 */
export async function loadLstmOnnxModel(modelUrl = '/onnx_models/lstm_model.onnx') {
  if (cachedLstmSession && cachedLstmModelUrl === modelUrl) {
    console.log('✅ Using cached LSTM ONNX model');
    return { session: cachedLstmSession, metadata: cachedLstmMetadata };
  }

  try {
    // Configure WASM backend
    if (typeof window !== 'undefined') {
      ort.env.wasm.numThreads = Math.min(4, navigator?.hardwareConcurrency || 2);
      ort.env.wasm.wasmPaths = 'https://unpkg.com/onnxruntime-web@1.23.2/dist/';
      console.log('✅ LSTM ONNX WASM configured:', {
        numThreads: ort.env.wasm.numThreads,
        wasmPaths: ort.env.wasm.wasmPaths
      });
    }

    // Resolve an existing URL from common locations
    const resolvedUrl = await resolveExistingUrl([
      modelUrl,
      '/onnx_models/lstm_model.onnx',
      '/lstm_model.onnx'
    ]);
    if (!resolvedUrl) {
      throw new Error(`LSTM ONNX not found. Checked: ${[modelUrl, '/onnx_models/lstm_model.onnx', '/lstm_model.onnx'].join(', ')}`);
    }

    console.log('🔄 Loading LSTM ONNX model from:', resolvedUrl);
    const session = await ort.InferenceSession.create(resolvedUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });

    // Extract metadata
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const inputInfo = session.modelMetadata?.inputMetadata?.[inputName];
    const outputInfo = session.modelMetadata?.outputMetadata?.[outputName];

    const inputShape = inputInfo?.shape || [1, LSTM_SEQUENCE_LENGTH, LSTM_FEATURE_SIZE];
    const outputShape = outputInfo?.shape || [1, LSTM_WORD_LABELS.length];

    console.log('✅ LSTM ONNX model loaded:', {
      inputName,
      inputShape,
      outputName,
      outputShape,
      expectedSequenceLength: LSTM_SEQUENCE_LENGTH,
      featureSize: LSTM_FEATURE_SIZE,
      numClasses: LSTM_WORD_LABELS.length,
      labels: LSTM_WORD_LABELS
    });

    const metadata = {
      inputName,
      inputShape,
      outputName,
      outputShape,
      sequenceLength: LSTM_SEQUENCE_LENGTH,
      featureSize: LSTM_FEATURE_SIZE,
      labels: LSTM_WORD_LABELS
    };

    cachedLstmSession = session;
    cachedLstmMetadata = metadata;
    cachedLstmModelUrl = resolvedUrl;

    return { session, metadata };
  } catch (error) {
    console.error('❌ LSTM ONNX model loading error:', error);
    throw error;
  }
}

/**
 * Build input tensor for LSTM model
 * Expects: sequence of 30 frames, each with 1662 features
 * Shape: (1, 30, 1662)
 */
function buildLstmInputTensor(sequence) {
  if (!Array.isArray(sequence) || sequence.length === 0) {
    throw new Error('No sequence provided for LSTM tensor building');
  }

  // Ensure we have exactly 30 frames
  const frames = sequence.slice(-LSTM_SEQUENCE_LENGTH);
  if (frames.length < LSTM_SEQUENCE_LENGTH) {
    // Pad with zeros if we don't have enough frames
    const padding = new Array(LSTM_SEQUENCE_LENGTH - frames.length).fill(null).map(() => new Array(LSTM_FEATURE_SIZE).fill(0));
    frames.unshift(...padding);
  }

  // Validate each frame has 1662 features
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const len = f && typeof f.length === 'number' ? f.length : 0; // supports TypedArray and Array
    if (len !== LSTM_FEATURE_SIZE) {
      const type = Object.prototype.toString.call(f);
      throw new Error(`Frame ${i} has invalid length: expected ${LSTM_FEATURE_SIZE}, got ${len} (type=${type})`);
    }
  }

  // Build tensor: (1, 30, 1662)
  const dims = [1, LSTM_SEQUENCE_LENGTH, LSTM_FEATURE_SIZE];
  const total = dims.reduce((acc, dim) => acc * dim, 1);
  const data = new Float32Array(total);

  // Fill data: flatten sequence into tensor
  let idx = 0;
  for (let t = 0; t < LSTM_SEQUENCE_LENGTH; t++) {
    const src = frames[t];
    for (let f = 0; f < LSTM_FEATURE_SIZE; f++) {
      const val = src[f] ?? 0;
      data[idx] = Number.isFinite(val) ? val : 0;
      idx++;
    }
  }

  console.log(`🔢 Built LSTM tensor: [${dims.join(', ')}] from ${sequence.length} frame(s)`);
  return new ort.Tensor('float32', data, dims);
}

/**
 * Compute probabilities from LSTM model output
 * Model outputs softmax probabilities (15 classes)
 */
function computeLstmProbabilities(output) {
  const probs = Array.from(output);

  // Validate output
  const hasNaN = probs.some(v => !Number.isFinite(v));
  if (hasNaN) {
    console.error('⚠️ LSTM model output contains NaN or invalid values:', {
      output: probs.slice(0, 5),
      allValid: probs.every(v => Number.isFinite(v))
    });
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

/**
 * Predict word using LSTM model
 * @param {Object} sessionBundle - { session, metadata }
 * @param {Array} sequence - Array of 30 frames, each with 1662 features
 * @returns {Promise<Object>} - { label, probability, index, probabilities, rawOutput }
 */
export async function predictWord(sessionBundle, sequence) {
  if (!sessionBundle?.session) {
    throw new Error('LSTM ONNX session not provided');
  }

  if (!Array.isArray(sequence) || sequence.length === 0) {
    throw new Error('No sequence provided for LSTM prediction');
  }

  try {
    const tensor = buildLstmInputTensor(sequence);
    const feeds = { [sessionBundle.metadata.inputName]: tensor };

    console.log('🔮 Running LSTM prediction:', {
      inputShape: tensor.dims,
      sequenceLength: sequence.length,
      expectedSequenceLength: LSTM_SEQUENCE_LENGTH
    });

    const results = await sessionBundle.session.run(feeds);
    const outputTensor = results[sessionBundle.metadata.outputName] ?? results[sessionBundle.session.outputNames[0]];

    if (!outputTensor) {
      throw new Error('LSTM ONNX model returned no output tensor');
    }

    const output = Array.from(outputTensor.data);
    const { bestIndex, bestProb, probabilities } = computeLstmProbabilities(output);

    const labels = LSTM_WORD_LABELS;
    const label = labels[bestIndex] ?? `Class ${bestIndex}`;

    console.log('🎯 LSTM Prediction Result:', {
      outputSize: output.length,
      bestIndex,
      bestLabel: label,
      bestProbability: bestProb,
      top3: probabilities
        .map((p, i) => ({
          index: i,
          label: labels[i] ?? `Class ${i}`,
          prob: p
        }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3)
    });

    return {
      label,
      probability: bestProb,
      index: bestIndex,
      probabilities,
      rawOutput: output
    };
  } catch (error) {
    console.error('❌ LSTM prediction error:', {
      error: error.message,
      sequenceLength: sequence.length,
      expectedSequenceLength: LSTM_SEQUENCE_LENGTH
    });
    throw error;
  }
}

/**
 * Reset cached LSTM model
 */
export function resetCachedLstmModel() {
  cachedLstmSession = null;
  cachedLstmMetadata = null;
  cachedLstmModelUrl = null;
}