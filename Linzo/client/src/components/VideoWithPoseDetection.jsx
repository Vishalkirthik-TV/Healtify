import React, { useEffect, useRef, useState } from 'react';
import Loader from './Loader';
import Webcam from 'react-webcam';
import { Holistic, POSE_CONNECTIONS, HAND_CONNECTIONS, FACEMESH_TESSELATION, FACEMESH_RIGHT_EYE, FACEMESH_RIGHT_EYEBROW, FACEMESH_LEFT_EYE, FACEMESH_LEFT_EYEBROW, FACEMESH_FACE_OVAL, FACEMESH_LIPS } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { ISLBertWSClient, flattenFrames } from '../lib/islWs';
import { predictKeypointsHTTP } from '../lib/islApi';
import { ISLAlphabetWSClient, extractHandLandmarks } from '../lib/islAlphabetWs';
import { loadAlphabetOnnxModel, predictAlphabet } from '../lib/islOnnx';
import { loadLstmOnnxModel, predictWord, extractKeypointsForLstm } from '../lib/islLstmOnnx';

const VideoWithPoseDetection = ({
  isActive,
  onTextDetected,
  onSpeechGenerated,
  onStreamReady,
  // Note: alphabet mode removed for sign->text; this component uses BERT backend only
  mode = 'phrases',
  onAlphabetLetter,
  onAlphabetControlGesture,
  alphabetModelUrl = '/onnx_models/isl_model.onnx',
  useClientAlphabetModel = false
}) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('initializing');

  const [detectedText, setDetectedText] = useState('');
  const [hasFaceDetected, setHasFaceDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentHands, setCurrentHands] = useState([]);

  const holisticRef = useRef(null);
  const rafIdRef = useRef(null);
  const streamSentRef = useRef(false);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const isActiveRef = useRef(isActive);

  // TFJS local model removed for sign->text flow; using WS BERT backend only
  const wsClientRef = useRef(null);
  const wsBufferRef = useRef([]); // holds last N frames for backend streaming
  const lastWSSendAtRef = useRef(0);
  const lastPredictionAtRef = useRef(0);
  const useBertBackend = (import.meta?.env?.VITE_USE_BERT_BACKEND || 'true') === 'true';
  const useHttpBackend = (import.meta?.env?.VITE_USE_HTTP_BACKEND || 'true') === 'true';
  const isHTTPBusyRef = useRef(false);
  const lastHTTPAtRef = useRef(0);
  const handPresenceRef = useRef([]); // track recent hand-present frames
  const PREDICTION_COOLDOWN_MS = 1500;
  const MIN_CONFIDENCE = 0.5; // relaxed to reduce misses
  const MIN_HAND_FRAMES_IN_WINDOW = 12; // relaxed but still filters idle

  // ISL Alphabet Detection WebSocket client
  const islAlphabetWsRef = useRef(null);
  const lastAlphabetPredictionAtRef = useRef(0);
  const alphabetPredictionCooldown = 500; // Reduced to 500ms for better responsiveness
  const landmarkBufferRef = useRef([]); // Buffer for smoothing landmarks
  const bufferSize = 3; // Average last 3 frames for stability
  const lastSpokenLetterRef = useRef(null); // Track last spoken letter to prevent repetition
  const lastSpokenTimeRef = useRef(0); // Track when last letter was spoken
  const clearTrackingTimeoutRef = useRef(null); // Timeout to clear tracking after speaking
  const TTS_COOLDOWN_MS = 300; // Short cooldown to prevent rapid repetition (300ms)
  const alphabetOnnxBundleRef = useRef(null);
  const alphabetFeatureBufferRef = useRef([]);
  const isAlphabetOnnxBusyRef = useRef(false);
  const isAlphabetOnnxLoadingRef = useRef(false);

  // LSTM Word Model refs
  const lstmOnnxBundleRef = useRef(null);
  const lstmSequenceBufferRef = useRef([]); // Buffer for 30 frames (1662 features each)
  const isLstmOnnxBusyRef = useRef(false);
  const isLstmOnnxLoadingRef = useRef(false);
  const lstmPredictionCooldown = 1000; // 1 second cooldown for LSTM predictions
  const lastLstmPredictionAtRef = useRef(0);
  // Finger-state temporal smoothing to avoid 2→3 flicker
  const fingerStateHistoryRef = useRef([]); // store last N boolean[5]
  const FINGER_HISTORY = 5;
  // LSTM gating based on recent hand presence
  const lstmHandPresenceRef = useRef([]); // boolean window for last frames
  const LSTM_HAND_WINDOW = 5; // Reduced from 20 - only need recent hand activity
  const LSTM_MIN_HAND_FRAMES = 1; // Reduced from 10 - LSTM uses pose+face too, not just hands // require at least 10 of last 20 frames with hands
  // Majority voting buffers (matching reference app)
  const recentPredictionsRef = useRef([]);
  // Store normalized landmarks for averaging BEFORE pixel conversion (matching Python isl_detection.py line 107-108)
  const normalizedLandmarkHistoryRef = useRef([]); // Stores normalized [x, y] landmarks (21 points = 42 values)
  // Pre-processed landmark history (matching Reference_App.jsx line 23)
  const landmarkHistoryRef = useRef([]);
  const MIN_FRAMES_FOR_DETECTION = 3;
  const MIN_COUNT_FOR_MAJORITY = 3;
  const HISTORY_SIZE = 5;
  // Display smoothing buffers (per hand) to reduce overlay flicker
  const leftDisplayHistoryRef = useRef([]);
  const rightDisplayHistoryRef = useRef([]);
  // LSTM temporal consistency filtering (to reduce dream/dress false positives)
  const lstmPredictionHistoryRef = useRef([]); // Store last 3 LSTM predictions
  const LSTM_CONSISTENCY_WINDOW = 3;
  const LSTM_CONSISTENCY_THRESHOLD = 2; // Need 2/3 frames with same word
  const DISPLAY_HISTORY = 1; // Instant overlays - no smoothing (was 2)

  // Movement Detection for Model Arbitration (Solution 1)
  const previousFrameLandmarksRef = useRef(null); // Store previous frame for velocity calculation
  const [isMoving, setIsMoving] = useState(false); // Movement state for debug UI
  const movementHistoryRef = useRef([]); // Track last N movement readings for smoothing
  const MOVEMENT_HISTORY_SIZE = 5; // Number of frames to smooth over
  const MOVEMENT_MAJORITY_THRESHOLD = 4; // Need 4/5 frames to be moving (increased for stability)
  const alphabetSuppressionRef = useRef({ until: 0, reason: '' }); // Track alphabet suppression
  const MOVEMENT_THRESHOLD = 0.02; // 2% of screen = significant movement (increased from 1.5%)
  const SUPPRESSION_DURATION = 2000; // 2 seconds after movement stops (increased from 1.5s)
  const addStatusFlag = (flag) => {
    setDetectionStatus((prev) => {
      const parts = prev.split(' | ').filter(Boolean);
      if (parts.includes(flag)) return prev;
      if (parts.length === 0) return flag;
      return `${parts.join(' | ')} | ${flag}`;
    });
  };
  const removeStatusFlag = (flag) => {
    setDetectionStatus((prev) => {
      const parts = prev.split(' | ').filter(Boolean);
      if (!parts.includes(flag)) return prev;
      const next = parts.filter((item) => item !== flag);
      if (next.length === 0) return '✅ Holistic Detection Active';
      return next.join(' | ');
    });
  };

  // Exclude pose edges that connect wrist to finger bases to avoid green V-lines in palm
  const EXCLUDED_POSE_EDGES = new Set([
    '15,17', '17,15', // left wrist ↔ left pinky
    '15,19', '19,15', // left wrist ↔ left thumb
    '15,21', '21,15', // left wrist ↔ left index
    '16,20', '20,16', // right wrist ↔ right pinky
    '16,18', '18,16', // right wrist ↔ right index
    '16,22', '22,16'  // right wrist ↔ right thumb
  ]);
  // OpenHands mediapipe_holistic_minimal_27 over 75-keypoint layout (33 pose + 21 LH + 21 RH)
  const MINIMAL_27_INDEXES = [
    0, 2, 5, 11, 12, 13, 14, 33, 37, 38, 41, 42, 45, 46, 49, 50, 53, 54, 58, 59, 62, 63, 66, 67, 70, 71, 74
  ];

  const islGestures = {
    'hello': { description: 'Open hand with fingers spread', confidence: 0.8 },
    'thank_you': { description: 'Both hands open, palms up', confidence: 0.8 },
    'yes': { description: 'Thumbs up gesture', confidence: 0.9 },
    'no': { description: 'Index finger pointing', confidence: 0.9 },
    'help': { description: 'Hands raised for help', confidence: 0.8 }
  };

  // Utility function to smooth landmarks and reduce flickering
  const smoothLandmarks = (landmarks) => {
    landmarkBufferRef.current.push(landmarks);
    if (landmarkBufferRef.current.length > bufferSize) {
      landmarkBufferRef.current.shift();
    }

    // Average the landmarks in the buffer
    if (landmarkBufferRef.current.length === bufferSize) {
      const smoothed = new Array(42).fill(0);
      for (let i = 0; i < 42; i++) {
        let sum = 0;
        for (let j = 0; j < bufferSize; j++) {
          sum += landmarkBufferRef.current[j][i] || 0;
        }
        smoothed[i] = sum / bufferSize;
      }
      return smoothed;
    }

    return landmarks;
  };

  /**
   * Detect movement by calculating velocity of key landmarks
   * Used to determine if user is signing a dynamic word (LSTM) vs static letter (Alphabet)
   * Returns: { isMoving: boolean, velocity: number }
   */
  const detectMovement = (currentResults) => {
    if (!previousFrameLandmarksRef.current) {
      // First frame, no previous data
      previousFrameLandmarksRef.current = {
        pose: currentResults.poseLandmarks,
        leftHand: currentResults.leftHandLandmarks,
        rightHand: currentResults.rightHandLandmarks
      };
      return { isMoving: false, velocity: 0 };
    }

    const prev = previousFrameLandmarksRef.current;
    let totalMovement = 0;
    let landmarkCount = 0;

    // Key landmarks for movement detection (wrists, elbows, shoulders)
    const keyPoseIndices = [11, 12, 13, 14, 15, 16]; // Shoulders, elbows, wrists

    // Calculate pose landmark movement
    if (currentResults.poseLandmarks && prev.pose) {
      for (const idx of keyPoseIndices) {
        if (idx < currentResults.poseLandmarks.length && idx < prev.pose.length) {
          const curr = currentResults.poseLandmarks[idx];
          const old = prev.pose[idx];
          const dx = curr.x - old.x;
          const dy = curr.y - old.y;
          totalMovement += Math.sqrt(dx * dx + dy * dy);
          landmarkCount++;
        }
      }
    }

    // Calculate hand movement (center of mass)
    const calcHandCenter = (hand) => {
      if (!hand || hand.length === 0) return null;
      const sum = hand.reduce((acc, lm) => ({ x: acc.x + lm.x, y: acc.y + lm.y }), { x: 0, y: 0 });
      return { x: sum.x / hand.length, y: sum.y / hand.length };
    };

    const currLeftCenter = calcHandCenter(currentResults.leftHandLandmarks);
    const prevLeftCenter = calcHandCenter(prev.leftHand);
    if (currLeftCenter && prevLeftCenter) {
      const dx = currLeftCenter.x - prevLeftCenter.x;
      const dy = currLeftCenter.y - prevLeftCenter.y;
      totalMovement += Math.sqrt(dx * dx + dy * dy) * 2; // Weight hands higher
      landmarkCount++;
    }

    const currRightCenter = calcHandCenter(currentResults.rightHandLandmarks);
    const prevRightCenter = calcHandCenter(prev.rightHand);
    if (currRightCenter && prevRightCenter) {
      const dx = currRightCenter.x - prevRightCenter.x;
      const dy = currRightCenter.y - prevRightCenter.y;
      totalMovement += Math.sqrt(dx * dx + dy * dy) * 2; // Weight hands higher
      landmarkCount++;
    }

    // Update previous frame
    previousFrameLandmarksRef.current = {
      pose: currentResults.poseLandmarks,
      leftHand: currentResults.leftHandLandmarks,
      rightHand: currentResults.rightHandLandmarks
    };

    // Calculate average velocity
    const velocity = landmarkCount > 0 ? totalMovement / landmarkCount : 0;
    const moving = velocity > MOVEMENT_THRESHOLD;

    return { isMoving: moving, velocity };
  };

  const pushAlphabetFrame = (landmarks) => {
    const copy = Array.isArray(landmarks) ? [...landmarks] : [];
    if (copy.length === 0) return false;
    alphabetFeatureBufferRef.current.push(copy);
    if (alphabetFeatureBufferRef.current.length > 120) {
      alphabetFeatureBufferRef.current.splice(0, alphabetFeatureBufferRef.current.length - 120);
    }
    return true;
  };

  const handleAlphabetPredictionResult = (prediction, handSide = 'unknown') => {
    console.log('📥 handleAlphabetPredictionResult called:', { prediction, handSide });

    if (!prediction?.label) {
      console.warn('⚠️ No label in prediction:', prediction);
      return;
    }

    // Update global debug state for UI
    window.lastAlphaPred = prediction;

    const letter = `${prediction.label}`.trim();
    const confidence = typeof prediction.probability === 'number' ? prediction.probability : 0;

    console.log(`🔍 Prediction received: "${letter}" with confidence ${(confidence * 100).toFixed(2)}%`);

    // Use server-side confidence threshold (0.7) matching reference app
    // Reference app uses CONFIDENCE_THRESHOLD = 0.7
    const CONFIDENCE_THRESHOLD = 0.7;
    if (!letter || confidence < CONFIDENCE_THRESHOLD) {
      console.log(`⏭️ Skipping prediction - letter: "${letter}", confidence: ${(confidence * 100).toFixed(2)}% (threshold: ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}%)`);
      return;
    }

    const letterChanged = lastSpokenLetterRef.current !== letter;
    const now = performance.now();
    const cooldownExpired = now - lastSpokenTimeRef.current > TTS_COOLDOWN_MS;

    console.log(`✅ ONNX Alphabet letter: ${letter} (${(confidence * 100).toFixed(2)}%, hand: ${handSide})`);
    setDetectedText(`${letter} (${(confidence * 100).toFixed(1)}%)`);

    if (letterChanged || cooldownExpired) {
      // Do not speak out "noaction" (LSTM idle class)
      if (letter.toLowerCase() !== 'noaction') {
        // speakText(letter); // Removed local playback
        onSpeechGenerated && onSpeechGenerated(letter);
      }
      lastSpokenLetterRef.current = letter;
      lastSpokenTimeRef.current = now;
      if (clearTrackingTimeoutRef.current) {
        clearTimeout(clearTrackingTimeoutRef.current);
      }
      clearTrackingTimeoutRef.current = setTimeout(() => {
        setDetectedText('');
        clearTrackingTimeoutRef.current = null;
      }, 500);
    } else {
      console.log(`🔇 Skipping TTS - same letter \"${letter}\" already spoken (cooldown: ${(now - lastSpokenTimeRef.current).toFixed(0)}ms)`);
    }

    onAlphabetLetter && onAlphabetLetter(letter);
    onTextDetected && onTextDetected(letter, prediction.index);
    lastAlphabetPredictionAtRef.current = performance.now();
  };

  const runLstmOnnxPrediction = async () => {
    if (!lstmOnnxBundleRef.current) return;
    const bundle = lstmOnnxBundleRef.current;
    if (!bundle) return;
    if (isLstmOnnxBusyRef.current) return;
    // Gate by recent hand presence to avoid spurious detections without hands
    // const window = lstmHandPresenceRef.current.slice(-LSTM_HAND_WINDOW);
    // const handFrames = window.filter(Boolean).length;
    // if (window.length < LSTM_HAND_WINDOW || handFrames < LSTM_MIN_HAND_FRAMES) {
    //   // Not enough recent hand frames, skip running LSTM this cycle
    //   return;
    // }

    const now = performance.now();
    if (now - lastLstmPredictionAtRef.current < lstmPredictionCooldown) {
      return;
    }

    // LSTM model needs exactly 30 frames
    if (lstmSequenceBufferRef.current.length < 30) {
      if (frameCountRef.current % 60 === 0) {
        console.log(`⏳ Waiting for more frames for LSTM: ${lstmSequenceBufferRef.current.length}/30`);
      }
      return;
    }

    isLstmOnnxBusyRef.current = true;
    try {
      // Get the last 30 frames
      const sequence = lstmSequenceBufferRef.current.slice(-30);

      if (frameCountRef.current % 60 === 0) {
        console.log(`🔮 Running LSTM prediction with ${sequence.length} frames`);
      }
      const prediction = await predictWord(bundle, sequence);

      // Handle the prediction result directly here
      if (prediction) {
        // Update global debug state for UI
        window.lastLstmPred = prediction;

        const label = prediction.label.toLowerCase();
        const confidence = prediction.probability;
        const predictionIndex = prediction.index; // Class index (0-14)

        // REFERENCE IMPLEMENTATION: Track prediction INDICES (not labels)
        // This matches line 84-86 in livefeedtest_demo.ipynb
        if (!lstmPredictionHistoryRef.current) lstmPredictionHistoryRef.current = [];
        lstmPredictionHistoryRef.current.push(predictionIndex);
        if (lstmPredictionHistoryRef.current.length > 10) {
          lstmPredictionHistoryRef.current.shift();
        }

        // STABILITY CHECK (EXACT REFERENCE LOGIC)
        // Check: np.unique(predictions[-10:])[0] == np.argmax(res)
        // Meaning: Last 10 predictions should have ONLY ONE unique value, and it's the current prediction
        let isStable = false;
        if (lstmPredictionHistoryRef.current.length === 10) {
          const uniqueIndices = [...new Set(lstmPredictionHistoryRef.current)];
          isStable = uniqueIndices.length === 1 && uniqueIndices[0] === predictionIndex;
        }

        // HAND PRESENCE GATE (Output Side)
        // Check if hands were present in the last 15 frames
        const recentHands = lstmHandPresenceRef.current.slice(-15);
        const hasHandsRecently = recentHands.some(Boolean);

        // Filter out "noaction", low confidence, unstable predictions, or missing hands
        // Reference threshold: 0.6 (line 69 in notebook)
        if (label !== 'noaction' && label !== '' && confidence > 0.6) {
          if (!isStable) {
            console.log(`⏳ Unstable prediction: ${label} (waiting for 10 consecutive stable frames)`);
          } else if (!hasHandsRecently) {
            console.log(`✋ No hands detected recently - suppressing "${label}" hallucination`);
          } else {
            console.log(`✅ LSTM Word detected: ${prediction.label} (${(confidence * 100).toFixed(2)}%)`);

            const displayLabel = prediction.label; // Keep original casing
            setDetectedText(`${displayLabel} (${(confidence * 100).toFixed(1)}%) result`);

            // Prevent spamming the same word repeatedly
            const timeSinceLast = now - lastSpokenTimeRef.current;
            if (lastSpokenLetterRef.current !== displayLabel || timeSinceLast > 2000) {
              onSpeechGenerated && onSpeechGenerated(displayLabel);
              onTextDetected && onTextDetected(displayLabel, prediction.index || 0);
              lastSpokenLetterRef.current = displayLabel;
              lastSpokenTimeRef.current = now;

              // Clear text after a delay
              if (clearTrackingTimeoutRef.current) clearTimeout(clearTrackingTimeoutRef.current);
              clearTrackingTimeoutRef.current = setTimeout(() => {
                setDetectedText('');
              }, 2000);
            }
          }
        }
      }

      return prediction;
    } catch (error) {
      console.error('❌ LSTM ONNX prediction failed:', error);
      return null;
    } finally {
      isLstmOnnxBusyRef.current = false;
      lastLstmPredictionAtRef.current = performance.now();
    }
  };

  const runAlphabetOnnxPrediction = async (handSide = 'unknown') => {
    if (!useClientAlphabetModel) return;
    const bundle = alphabetOnnxBundleRef.current;
    if (!bundle) return;
    if (isAlphabetOnnxBusyRef.current) return;

    const now = performance.now();
    if (now - lastAlphabetPredictionAtRef.current < alphabetPredictionCooldown) {
      return;
    }

    if (!alphabetFeatureBufferRef.current.length) {
      return;
    }

    // Server-side model processes single frame, but we can use recent frames for smoothing
    // Similar to server-side: average recent frames before pre-processing
    const MIN_FRAMES_FOR_SMOOTHING = 3;
    if (alphabetFeatureBufferRef.current.length < MIN_FRAMES_FOR_SMOOTHING) {
      if (frameCountRef.current % 30 === 0) {
        console.log(`⏳ Waiting for more frames for smoothing: ${alphabetFeatureBufferRef.current.length}/${MIN_FRAMES_FOR_SMOOTHING}`);
      }
      return;
    }

    isAlphabetOnnxBusyRef.current = true;
    try {
      // Get image dimensions for pixel coordinate conversion (matching Reference_App.jsx)
      const imageWidth = webcamRef.current?.video?.videoWidth || 640;
      const imageHeight = webcamRef.current?.video?.videoHeight || 480;

      // CRITICAL: Process the most recent frame only (matching Python isl_detection.py)
      // Python processes one frame at a time, not in batches
      // Use the most recent frame from the buffer
      if (alphabetFeatureBufferRef.current.length === 0) {
        return;
      }

      const rawFrame = alphabetFeatureBufferRef.current[alphabetFeatureBufferRef.current.length - 1];

      // CRITICAL: Match Python isl_detection.py EXACTLY:
      // 1. Store normalized landmarks in history (line 155-159)
      // 2. Average normalized landmarks (line 163)
      // 3. Convert averaged normalized landmarks to pixels (line 176)
      // 4. Pre-process pixel coordinates (line 177)

      if (rawFrame.length !== 42) {
        console.warn('⚠️ Invalid frame length:', rawFrame.length);
        return;
      }

      // Step 1: Store normalized landmarks in history (matching Python line 155-159)
      normalizedLandmarkHistoryRef.current.push(new Float32Array(rawFrame));
      if (normalizedLandmarkHistoryRef.current.length > HISTORY_SIZE) {
        normalizedLandmarkHistoryRef.current.shift();
      }

      // Step 2: Average normalized landmarks (matching Python line 163)
      // Python: averaged_landmarks = np.mean(np.stack(list(history), axis=0), axis=0)
      // This averages across the first dimension (history), keeping the landmark structure
      let averagedNormalized;
      if (normalizedLandmarkHistoryRef.current.length > 1) {
        // Stack all normalized landmarks (like np.stack)
        // Each entry is a Float32Array of 42 values (21 points * 2 coords)
        const stacked = new Float32Array(42).fill(0);
        for (const arr of normalizedLandmarkHistoryRef.current) {
          for (let i = 0; i < 42; i++) {
            stacked[i] += arr[i];
          }
        }
        // Average (like np.mean with axis=0)
        averagedNormalized = new Float32Array(42);
        const count = normalizedLandmarkHistoryRef.current.length;
        for (let i = 0; i < 42; i++) {
          averagedNormalized[i] = stacked[i] / count;
        }
      } else {
        averagedNormalized = normalizedLandmarkHistoryRef.current[0];
      }

      // Step 3: Convert averaged normalized landmarks to pixel coordinates (matching Python line 176)
      // EXACT match Python isl_detection.py line 67-68: int(landmark.x * image_width)
      // Python uses int() which truncates (like Math.floor() for positive numbers)
      const landmarkListPx = [];
      for (let i = 0; i < averagedNormalized.length; i += 2) {
        if (i + 1 < averagedNormalized.length) {
          // Python: landmark_x = min(int(landmark.x * image_width), image_width - 1)
          const x = Math.min(Math.floor(averagedNormalized[i] * imageWidth), imageWidth - 1);
          const y = Math.min(Math.floor(averagedNormalized[i + 1] * imageHeight), imageHeight - 1);
          landmarkListPx.push([x, y]);
        }
      }

      // Step 4: Pre-process pixel coordinates (matching Python line 177)
      // 4a. Wrist-relative (matching Python line 76-79)
      const baseX = landmarkListPx[0][0];
      const baseY = landmarkListPx[0][1];
      const relative = landmarkListPx.map(([x, y]) => [x - baseX, y - baseY]);

      // 4b. Flatten (matching Python line 82)
      const flat = relative.flat();

      // 4c. Max-abs normalize (matching Python line 85-88)
      const maxValue = Math.max(...flat.map(Math.abs)) || 1.0;
      if (maxValue === 0) {
        console.warn('⚠️ All landmarks are at the same position, skipping');
        return;
      }
      const preProcessed = new Float32Array(flat.map(v => v / maxValue));

      // Validate pre-processed frame
      const hasInvalid = Array.from(preProcessed).some(v => !Number.isFinite(v));
      if (hasInvalid) {
        console.warn('⚠️ Pre-processed frame contains invalid values, skipping');
        return;
      }

      // Store pre-processed result (for single-frame prediction, not averaging again)
      landmarkHistoryRef.current = [preProcessed]; // Reset to single averaged result

      // Debug: Log pre-processed values occasionally
      if (frameCountRef.current % 60 === 0) {
        console.log('🔍 Pre-processed frame sample:', {
          first5: Array.from(preProcessed).slice(0, 5),
          last5: Array.from(preProcessed).slice(-5),
          min: Math.min(...Array.from(preProcessed)),
          max: Math.max(...Array.from(preProcessed)),
          historyLength: landmarkHistoryRef.current.length
        });
      }

      // Use the pre-processed result directly (already averaged from normalized landmarks)
      // Use the pre-processed result directly (already averaged from normalized landmarks)
      const averagedInput = landmarkHistoryRef.current[0];

      if (frameCountRef.current % 60 === 0) {
        console.log(`🔮 Running ONNX Alphabet prediction`);
      }

      // Run Alphabet Prediction ONLY
      let alphabetPrediction = null;
      try {
        alphabetPrediction = await predictAlphabet(bundle, [Array.from(averagedInput)], { imageWidth, imageHeight, skipPreprocessing: true });
      } catch (err) {
        console.error('❌ Alphabet prediction failed:', err);
      }

      // Process Alphabet Prediction
      if (alphabetPrediction) {
        // Update global debug state for UI immediately
        window.lastAlphaPred = alphabetPrediction;

        // Apply majority voting for alphabet model (matching reference app)
        if (alphabetPrediction.probability >= 0.7) { // Confidence threshold
          recentPredictionsRef.current.push(alphabetPrediction.index);
          if (recentPredictionsRef.current.length > HISTORY_SIZE) {
            recentPredictionsRef.current.shift();
          }

          if (recentPredictionsRef.current.length >= MIN_FRAMES_FOR_DETECTION) {
            // Count occurrences
            const counts = {};
            recentPredictionsRef.current.forEach(idx => {
              counts[idx] = (counts[idx] || 0) + 1;
            });

            // Find most common
            const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            if (best && best[1] >= MIN_COUNT_FOR_MAJORITY) {
              const majorityIndex = parseInt(best[0]);
              // Use ISL alphabet mapping (0-9, A-Z) - matching reference app
              const ISL_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
              const majorityLabel = ISL_ALPHABET[majorityIndex] || `Class ${majorityIndex}`;
              const majorityProb = alphabetPrediction.probability;

              console.log(`✅ Majority vote: ${majorityLabel} (votes: ${best[1]}/${recentPredictionsRef.current.length}, confidence: ${(majorityProb * 100).toFixed(2)}%)`);

              handleAlphabetPredictionResult({
                ...alphabetPrediction,
                index: majorityIndex,
                label: majorityLabel,
                probability: majorityProb
              }, handSide);
            }
          }
        } else {
          // Clear predictions if confidence is too low
          if (recentPredictionsRef.current.length > 0 && frameCountRef.current % 30 === 0) {
            console.log(`⏭️ Low confidence: ${(alphabetPrediction.probability * 100).toFixed(2)}% < 70%`);
          }
          // Optionally clear buffer here if needed, or just let it slide
        }
      }

    } catch (error) {
      console.error('❌ ONNX alphabet prediction failed:', error);
    } finally {
      isAlphabetOnnxBusyRef.current = false;
    }
  };

  const onResults = (results) => {
    if (!webcamRef.current?.video || !canvasRef.current) {
      console.log('❌ Missing webcam or canvas ref');
      return;
    }

    const canvasCtx = canvasRef.current.getContext('2d', { alpha: false }); // Disable alpha for performance
    const canvas = canvasRef.current;

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Performance optimization: Clear only the drawing area, not entire canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Disable image smoothing for faster rendering
    canvasCtx.imageSmoothingEnabled = false;

    // MOVEMENT DETECTION (Solution 1): Detect if user is signing a dynamic word vs static letter
    const movement = detectMovement(results);

    // SMOOTHING: Use temporal majority voting to eliminate jitter
    movementHistoryRef.current.push(movement.isMoving);
    if (movementHistoryRef.current.length > MOVEMENT_HISTORY_SIZE) {
      movementHistoryRef.current.shift();
    }

    // Count how many recent frames show movement
    const movingCount = movementHistoryRef.current.filter(Boolean).length;
    const smoothedIsMoving = movingCount >= MOVEMENT_MAJORITY_THRESHOLD;
    setIsMoving(smoothedIsMoving); // Update UI state with smoothed value

    // Log movement occasionally (show both raw and smoothed)
    if (frameCountRef.current % 60 === 0 && movement.velocity > 0.001) {
      console.log(`🏃 Movement: ${smoothedIsMoving ? 'MOVING' : 'STATIC'} (raw: ${movement.isMoving}, votes: ${movingCount}/${MOVEMENT_HISTORY_SIZE}, velocity: ${(movement.velocity * 100).toFixed(2)}%)`);
    }

    // Only log frame info occasionally to reduce console spam
    if (frameCountRef.current % 60 === 0) {
      console.log('📹 Frame received:', {
        hasPose: !!results.poseLandmarks,
        hasRightHand: !!results.rightHandLandmarks,
        hasLeftHand: !!results.leftHandLandmarks,
        hasFace: !!results.faceLandmarks,
        isActive: isActive,
        canvasSize: `${canvas.width}x${canvas.height}`
      });
    }

    const currentTime = performance.now();
    if (lastTimeRef.current > 0) {
      const deltaTime = currentTime - lastTimeRef.current;
    }
    lastTimeRef.current = currentTime;
    frameCountRef.current++;

    if (canvasCtx == null) throw new Error('Could not get context');

    try {
      // DEBUG: Update face detection status for UI
      const hasFace = !!results.faceLandmarks;
      setHasFaceDetected(hasFace);

      // Also log occasionally
      if (frameCountRef.current % 60 === 0) {
        console.log(`👤 Face detected: ${hasFace} (${results.faceLandmarks?.length || 0} points)`);
      }

      canvasCtx.save();
      // Reset transformations and clear the canvas completely to avoid ghosting
      canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineJoin = 'round';
      canvasCtx.lineCap = 'round';

      if (isActive) {
        const shouldUseAlphabetOnnx = mode === 'alphabet' && useClientAlphabetModel;
        const shouldUseAlphabetWs = mode === 'alphabet' && !useClientAlphabetModel && islAlphabetWsRef.current?.isConnected;
        let alphabetFrameCaptured = false;
        let alphabetHandSideForFrame = 'unknown';

        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        canvasCtx.fillRect(10, 10, 120, 24);
        canvasCtx.fillStyle = 'white';
        canvasCtx.font = '12px Arial';
        canvasCtx.fillText('Holistic Overlay', 16, 28);

        if (results.poseLandmarks) {
          // Only log occasionally
          if (frameCountRef.current % 60 === 0) {
            console.log('🦴 Drawing filtered pose connectors (no hand base edges):', results.poseLandmarks.length);
          }
          const filteredPoseConnections = POSE_CONNECTIONS.filter((edge) => {
            const key = `${edge[0]},${edge[1]}`;
            return !EXCLUDED_POSE_EDGES.has(key);
          });
          drawConnectors(canvasCtx, results.poseLandmarks, filteredPoseConnections,
            { color: 'rgba(0,255,0,0.4)', lineWidth: 2 }); // Reduced opacity and line width for better hand visibility
          // No pose landmark points to avoid overlap with hand landmarks
        }

        // Helper: smooth landmarks for display with outlier rejection
        const smoothForDisplay = (marks, side) => {
          if (!marks) return null;
          const histRef = side === 'left' ? leftDisplayHistoryRef : rightDisplayHistoryRef;
          const history = histRef.current;
          const wrist = marks[0], indexMcp = marks[5];
          const palmScale = wrist && indexMcp ? Math.hypot((indexMcp.x - wrist.x), (indexMcp.y - wrist.y)) : 0.07;
          const maxJump = Math.max(0.015, Math.min(0.08, palmScale * 0.8));
          const prev = history.length ? history[history.length - 1] : null;
          const smoothed = new Array(marks.length);
          for (let i = 0; i < marks.length; i++) {
            const cur = marks[i] || { x: 0, y: 0, z: 0 };
            if (prev && prev[i]) {
              let dx = cur.x - prev[i].x;
              let dy = cur.y - prev[i].y;
              let dz = (cur.z || 0) - (prev[i].z || 0);
              if (Math.abs(dx) > maxJump) dx = Math.sign(dx) * maxJump;
              if (Math.abs(dy) > maxJump) dy = Math.sign(dy) * maxJump;
              const blended = {
                x: prev[i].x + dx * 0.5,
                y: prev[i].y + dy * 0.5,
                z: prev[i].z + dz * 0.5
              };
              smoothed[i] = blended;
            } else {
              smoothed[i] = { x: cur.x || 0, y: cur.y || 0, z: cur.z || 0 };
            }
          }
          history.push(smoothed);
          if (history.length > DISPLAY_HISTORY) history.shift();
          const n = history.length;
          if (n <= 1) return smoothed;
          const averaged = new Array(marks.length);
          for (let i = 0; i < marks.length; i++) {
            let sx = 0, sy = 0, sz = 0;
            for (let h = 0; h < n; h++) {
              sx += history[h][i].x; sy += history[h][i].y; sz += history[h][i].z || 0;
            }
            averaged[i] = { x: sx / n, y: sy / n, z: sz / n };
          }
          return averaged;
        };

        const handsOverlap = (a, b) => {
          if (!a || !b) return false;
          const [ax, ay] = a.reduce((acc, lm) => [acc[0] + lm.x, acc[1] + lm.y], [0, 0]).map(v => v / a.length);
          const [bx, by] = b.reduce((acc, lm) => [acc[0] + lm.x, acc[1] + lm.y], [0, 0]).map(v => v / b.length);
          const dx = (ax - bx) * canvas.width;
          const dy = (ay - by) * canvas.height;
          // Increased threshold from 35 to 60 pixels for better hand separation
          return Math.sqrt(dx * dx + dy * dy) < 60;
        };
        const bboxArea = (marks) => {
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          marks.forEach(lm => { minX = Math.min(minX, lm.x); minY = Math.min(minY, lm.y); maxX = Math.max(maxX, lm.x); maxY = Math.max(maxY, lm.y); });
          return Math.max(1, (maxX - minX) * canvas.width) * Math.max(1, (maxY - minY) * canvas.height);
        };

        let leftMarks = results.leftHandLandmarks || null;
        let rightMarks = results.rightHandLandmarks || null;
        if (leftMarks && rightMarks && handsOverlap(leftMarks, rightMarks)) {
          const keepLeft = bboxArea(leftMarks) >= bboxArea(rightMarks);
          if (keepLeft) rightMarks = null; else leftMarks = null;
        }

        // Extract keypoints for LSTM model (always, regardless of mode)
        // LSTM needs pose + face + both hands (1662 features)
        const keypoints = extractKeypointsForLstm(results);
        lstmSequenceBufferRef.current.push(keypoints);
        if (lstmSequenceBufferRef.current.length > 30) {
          lstmSequenceBufferRef.current.shift(); // Keep only last 30 frames
        }

        // Clear tracking immediately when no hands are detected
        const hasHands = !!(rightMarks || leftMarks);
        if (!hasHands && mode === 'alphabet') {
          if (lastSpokenLetterRef.current !== null) {
            console.log('🧹 Clearing tracking - no hands detected');
            lastSpokenLetterRef.current = null;
            lastSpokenTimeRef.current = 0;
            setDetectedText('');
          }
          alphabetFeatureBufferRef.current = [];
          recentPredictionsRef.current = []; // Clear majority voting buffer
          normalizedLandmarkHistoryRef.current = []; // Clear normalized landmark history
          landmarkHistoryRef.current = []; // Clear pre-processed history
          landmarkBufferRef.current = []; // Clear smoothing buffer to prevent stale data
          // Note: Keep LSTM sequence buffer - it can work with pose/face even without hands
        }
        // Track hand presence for LSTM gating as well (independent of alphabet mode)
        lstmHandPresenceRef.current.push(!!(rightMarks || leftMarks));
        if (lstmHandPresenceRef.current.length > 60) {
          lstmHandPresenceRef.current.shift();
        }

        if (rightMarks) {
          // Only log occasionally to reduce console spam
          if (frameCountRef.current % 30 === 0) {
            console.log('✋ Drawing right hand landmarks:', results.rightHandLandmarks.length);
          }
          const rightDisplay = smoothForDisplay(rightMarks, 'right') || rightMarks;
          drawConnectors(canvasCtx, rightDisplay, HAND_CONNECTIONS, { color: '#FF0000', lineWidth: 3 }); // Reduced line width for better visibility
          drawLandmarks(canvasCtx, rightDisplay, { color: '#00FF00', lineWidth: 1.5, radius: 3 }); // Optimized landmark drawing
          if (mode === 'alphabet') {
            const now = performance.now();
            const { landmarks, handSide } = extractHandLandmarks(results, 'right');
            if (landmarks.length === 42) {
              const smoothedLandmarks = smoothLandmarks(landmarks);
              if (shouldUseAlphabetWs && now - lastAlphabetPredictionAtRef.current > alphabetPredictionCooldown) {
                if (frameCountRef.current % 30 === 0) {
                  console.log(`📤 Sending alphabet prediction request: ${landmarks.length} landmarks for ${handSide} hand`);
                }
                islAlphabetWsRef.current.sendPredictionRequest(smoothedLandmarks, 'right', now);
                lastAlphabetPredictionAtRef.current = now;
              }
              if (shouldUseAlphabetOnnx && !alphabetFrameCaptured) {
                if (pushAlphabetFrame(smoothedLandmarks)) {
                  alphabetFrameCaptured = true;
                  alphabetHandSideForFrame = handSide || 'right';
                }
              }
            } else if (frameCountRef.current % 60 === 0) {
              console.warn(`⚠️ Skipping alphabet prediction: only ${landmarks.length} landmarks`);
            }
          }
        }

        if (leftMarks) {
          // CRITICAL: Draw RAW landmarks for overlay (what MediaPipe actually detects)
          // This prevents overlay glitches - overlay shows actual detection, not smoothed
          // Only log occasionally to reduce console spam
          if (frameCountRef.current % 30 === 0) {
            console.log('✋ Drawing left hand landmarks:', results.leftHandLandmarks.length);
          }
          const leftDisplay = smoothForDisplay(leftMarks, 'left') || leftMarks;
          drawConnectors(canvasCtx, leftDisplay, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
          drawLandmarks(canvasCtx, leftDisplay, { color: '#FF0000', lineWidth: 1.5, radius: 3 });

          if (mode === 'alphabet') {
            const now = performance.now();
            const { landmarks, handSide } = extractHandLandmarks(results, 'left');
            if (landmarks.length === 42) {
              // CRITICAL: Only smooth landmarks for model prediction, NOT for display
              // Overlay shows raw MediaPipe detection, model gets smoothed version
              const smoothedLandmarks = smoothLandmarks(landmarks);
              if (shouldUseAlphabetWs && now - lastAlphabetPredictionAtRef.current > alphabetPredictionCooldown) {
                if (frameCountRef.current % 30 === 0) {
                  console.log(`📤 Sending alphabet prediction request: ${landmarks.length} landmarks for ${handSide} hand`);
                }
                islAlphabetWsRef.current.sendPredictionRequest(smoothedLandmarks, 'left', now);
                lastAlphabetPredictionAtRef.current = now;
              }
              if (shouldUseAlphabetOnnx && !alphabetFrameCaptured) {
                if (pushAlphabetFrame(smoothedLandmarks)) {
                  alphabetFrameCaptured = true;
                  alphabetHandSideForFrame = handSide || 'left';
                }
              }
            } else if (frameCountRef.current % 60 === 0) {
              console.warn(`⚠️ Skipping alphabet prediction: only ${landmarks.length} landmarks`);
            }
          }
        }

        if (shouldUseAlphabetOnnx && alphabetFrameCaptured && mode === 'alphabet') {
          runAlphabetOnnxPrediction(alphabetHandSideForFrame);
        } else if (mode === 'phrases') {
          // In Word Mode, run LSTM immediately
          runLstmOnnxPrediction();
        }

        // Disable face landmarks drawing for better performance and hand focus
        if (results.faceLandmarks && mode !== 'alphabet') {
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION,
            { color: '#C0C0C070', lineWidth: 1 });
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYE,
            { color: '#FF3030' });
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYE,
            { color: '#30FF30' });
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYEBROW,
            { color: '#30FF30' });
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYEBROW,
            { color: '#FF3030' });
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_FACE_OVAL,
            { color: '#E0E0E0' });
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LIPS,
            { color: '#E0E0E0' });
        }
      }

      canvasCtx.restore();

      if (isActive) {
        const handsCount = [results.rightHandLandmarks, results.leftHandLandmarks].filter(Boolean).length;
        setCurrentHands(Array(handsCount).fill({}));
      }

      // Build a 27-point vector per frame for backend using OpenHands 75->27 selection
      if (isActive) {
        // Assemble 75 keypoints: 33 pose + 21 left hand + 21 right hand
        const totalV = 75;
        const frame75 = new Array(totalV * 3).fill(0);

        // Pose 33 (indices 0..32)
        if (results.poseLandmarks) {
          for (let i = 0; i < 33; i++) {
            const lm = results.poseLandmarks[i];
            if (!lm) continue;
            const base = i * 3;
            frame75[base] = lm.x || 0;
            frame75[base + 1] = lm.y || 0;
            frame75[base + 2] = lm.z || 0;
          }
        }

        // Left hand 21 (indices 33..53)
        if (results.leftHandLandmarks) {
          for (let i = 0; i < 21; i++) {
            const lm = results.leftHandLandmarks[i];
            if (!lm) continue;
            const idx = 33 + i;
            const base = idx * 3;
            frame75[base] = lm.x || 0;
            frame75[base + 1] = lm.y || 0;
            frame75[base + 2] = lm.z || 0;
          }
        }

        // Right hand 21 (indices 54..74)
        if (results.rightHandLandmarks) {
          for (let i = 0; i < 21; i++) {
            const lm = results.rightHandLandmarks[i];
            if (!lm) continue;
            const idx = 54 + i;
            const base = idx * 3;
            frame75[base] = lm.x || 0;
            frame75[base + 1] = lm.y || 0;
            frame75[base + 2] = lm.z || 0;
          }
        }

        // Select minimal 27 indices
        const f = new Array(27 * 3).fill(0);
        for (let j = 0; j < MINIMAL_27_INDEXES.length; j++) {
          const srcIdx = MINIMAL_27_INDEXES[j];
          const srcBase = srcIdx * 3;
          const dstBase = j * 3;
          f[dstBase] = frame75[srcBase];
          f[dstBase + 1] = frame75[srcBase + 1];
          f[dstBase + 2] = 0; // ignore z for backend; server will normalize
        }

        wsBufferRef.current.push(f);
        // Track hand presence for gating predictions
        const handsPresent = !!results.leftHandLandmarks || !!results.rightHandLandmarks;
        handPresenceRef.current.push(handsPresent);
        if (handPresenceRef.current.length > 60) handPresenceRef.current.shift();
        if (wsBufferRef.current.length > 120) wsBufferRef.current.shift();
        if (wsClientRef.current?.isConnected) {
          const now = performance.now();
          if (now - lastWSSendAtRef.current > 100) {
            lastWSSendAtRef.current = now;
            const windowFrames = wsBufferRef.current.slice(-60);
            const flat = flattenFrames(windowFrames);
            wsClientRef.current.sendKeypointsFloatArray(flat);
          }
        }
        // HTTP fallback or parallel predictions
        if (useHttpBackend) {
          const nowHttp = performance.now();
          const cooledDown = nowHttp - lastHTTPAtRef.current > 1200;
          const haveWindow = wsBufferRef.current.length >= 60;
          if (cooledDown && haveWindow && !isHTTPBusyRef.current) {
            isHTTPBusyRef.current = true;
            lastHTTPAtRef.current = nowHttp;
            const windowFrames = wsBufferRef.current.slice(-120);
            predictKeypointsHTTP(windowFrames, { url: import.meta?.env?.VITE_ISL_HTTP_URL })
              .then((msg) => {
                const score = typeof msg?.score === 'number' ? msg.score : 0;
                const handFrames = handPresenceRef.current.slice(-40).filter(Boolean).length;
                if (msg?.prediction && score >= MIN_CONFIDENCE && handFrames >= MIN_HAND_FRAMES_IN_WINDOW) {
                  const text = msg.prediction;
                  setDetectedText(text);
                  // speakText(text);
                  onTextDetected && onTextDetected(text, msg.class_id);
                  onSpeechGenerated && onSpeechGenerated(text);
                  lastPredictionAtRef.current = performance.now();
                }
              })
              .catch(() => { })
              .finally(() => { isHTTPBusyRef.current = false; });
          }
        }
      }

      // Local TFJS prediction path removed
    } catch (error) {
      console.error('❌ Canvas context error:', error);
      return;
    }
  };

  // Local TFJS feature extraction removed

  // Local TFJS prediction removed

  // Local TFJS utility removed

  // Alphabet prediction removed

  const processHandForGesture = (landmarks, handSide) => {
    if (isProcessing || !isActive) return;

    const gesture = analyzeHandGesture(landmarks);

    if (gesture) {
      const confidence = calculateGestureConfidence(landmarks, gesture);

      if (confidence > 0.7) {
        const currentGestureText = `${handSide} hand: ${gesture}`;
        if (detectedText === currentGestureText) {
          return;
        }

        setIsProcessing(true);
        const text = gestureToText(gesture);
        setDetectedText(currentGestureText);
        console.log('🤟 Detected gesture:', gesture, 'from', handSide, 'hand, Confidence:', confidence);

        // Controls: forward control gestures even in alphabet mode
        if (mode === 'alphabet' && typeof onAlphabetControlGesture === 'function') {
          onAlphabetControlGesture(gesture);
        } else {
          // speakText(text);
          onTextDetected(text, gesture);
          onSpeechGenerated(text);
        }

        setTimeout(() => setIsProcessing(false), 2000);
      }
    }
  };

  const analyzeHandGesture = (landmarks) => {
    if (!landmarks || landmarks.length < 21) return null;

    // Robust, rotation-invariant extension check using joint angles and adaptive thresholds.
    // Joints: thumb(2-3-4), index(5-6-8 via 6-7-8), middle(9-10-12), ring(13-14-16), pinky(17-18-20)
    const triplets = [
      [2, 3, 4],   // thumb: CMC-MCP-TIP (approx)
      [5, 6, 8],   // index: MCP-PIP-TIP
      [9, 10, 12], // middle
      [13, 14, 16],// ring
      [17, 18, 20] // pinky
    ];
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const palmScale = Math.hypot((indexMcp.x - wrist.x), (indexMcp.y - wrist.y)) || 0.05; // ~hand size

    const angleAt = (a, b, c) => {
      const v1x = a.x - b.x, v1y = a.y - b.y;
      const v2x = c.x - b.x, v2y = c.y - b.y;
      const dot = v1x * v2x + v1y * v2y;
      const n1 = Math.hypot(v1x, v1y);
      const n2 = Math.hypot(v2x, v2y);
      const cos = Math.min(1, Math.max(-1, dot / ((n1 || 1) * (n2 || 1))));
      return Math.acos(cos); // radians
    };

    const currentState = triplets.map((t, idx) => {
      const a = landmarks[t[0]], b = landmarks[t[1]], c = landmarks[t[2]];
      if (!a || !b || !c) return false;
      const theta = angleAt(a, b, c); // straight ~ pi, curled smaller
      // Adaptive threshold: allow more bend for thumb, scale with palm size noise
      const base = idx === 0 ? 2.2 : 2.4; // radians (~126° thumb, ~137° others)
      const adaptive = base - Math.min(0.25, palmScale * 0.6); // small hands → slightly lower threshold
      return theta >= adaptive;
    });

    // Temporal smoothing: majority over last FINGER_HISTORY frames
    fingerStateHistoryRef.current.push(currentState);
    if (fingerStateHistoryRef.current.length > FINGER_HISTORY) fingerStateHistoryRef.current.shift();
    const smoothed = currentState.map((_, i) => {
      let count = 0;
      for (const arr of fingerStateHistoryRef.current) if (arr[i]) count++;
      return count >= Math.ceil(FINGER_HISTORY / 2);
    });

    const [thumb, index, middle, ring, pinky] = smoothed;

    if (thumb && !index && !middle && !ring && !pinky) {
      return 'yes';
    }

    if (!thumb && index && !middle && !ring && !pinky) {
      return 'no';
    }

    if (thumb && index && middle && ring && pinky) {
      return 'hello';
    }

    if (!thumb && !index && !middle && !ring && !pinky) {
      return 'help';
    }

    if (!thumb && !index && !middle && !ring && !pinky) {
      const thumbTip = landmarks[4];
      const thumbBase = landmarks[3];
      if (thumbTip && thumbBase && thumbTip.y > thumbBase.y + 0.05) {
        return 'no';
      }
    }

    return null;
  };

  const calculateGestureConfidence = (landmarks, gesture) => {
    if (!landmarks || landmarks.length < 21) return 0;

    const fingerTips = [4, 8, 12, 16, 20];
    const fingerBases = [3, 5, 9, 13, 17];
    const wrist = landmarks[0];

    let confidence = 0;
    let totalChecks = 0;

    fingerTips.forEach((tip, index) => {
      const tipLandmark = landmarks[tip];
      const baseLandmark = landmarks[fingerBases[index]];

      if (tipLandmark && baseLandmark) {
        totalChecks++;

        if (index === 0) {
          const tipDistance = Math.sqrt(
            Math.pow(tipLandmark.x - wrist.x, 2) +
            Math.pow(tipLandmark.y - wrist.y, 2)
          );
          const baseDistance = Math.sqrt(
            Math.pow(baseLandmark.x - wrist.x, 2) +
            Math.pow(baseLandmark.y - wrist.y, 2)
          );

          const extensionRatio = tipDistance / baseDistance;
          if (extensionRatio > 1.2) confidence += 1;
          else if (extensionRatio > 1.1) confidence += 0.8;
          else if (extensionRatio > 1.0) confidence += 0.5;
        } else {
          const extension = baseLandmark.y - tipLandmark.y;
          if (extension > 0.03) confidence += 1;
          else if (extension > 0.02) confidence += 0.8;
          else if (extension > 0.01) confidence += 0.5;
        }
      }
    });

    return totalChecks > 0 ? confidence / totalChecks : 0;
  };

  const gestureToText = (gesture) => {
    const gestureTexts = {
      'hello': 'Hello',
      'thank_you': 'Thank you',
      'yes': 'Yes',
      'no': 'No',
      'help': 'Help'
    };
    return gestureTexts[gesture] || 'Unknown gesture';
  };

  // speakText removed - handled by parent component

  const stopDetection = () => {
    console.log('🛑 VideoWithPoseDetection: Component unmounting - stopping everything');

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      console.log('🛑 Speech synthesis stopped');
    }

    // Clear tracking timeout
    if (clearTrackingTimeoutRef.current) {
      clearTimeout(clearTrackingTimeoutRef.current);
      clearTrackingTimeoutRef.current = null;
    }

    // Reset all tracking refs
    lastSpokenLetterRef.current = null;
    lastSpokenTimeRef.current = 0;

    if (holisticRef.current) {
      try {
        holisticRef.current.close();
        console.log('🛑 Holistic detection stopped');
      } catch (error) {
        console.warn('⚠️ Error closing holistic detection:', error);
      }
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setIsInitialized(false);
    setDetectionStatus('⏸️ Detection Stopped');
    setCurrentHands([]);
    setDetectedText('');
    setIsProcessing(false);
  };

  useEffect(() => {
    console.log('🚀 Initializing MediaPipe Holistic...');

    const holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
      }
    });

    holistic.setOptions({
      selfieMode: true,
      modelComplexity: 2, // Use HEAVY model for better accuracy (fixes hand clipping)
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    holistic.onResults(onResults);
    holisticRef.current = holistic;

    console.log('✅ MediaPipe Holistic initialized successfully');

    setIsInitialized(true);
    setDetectionStatus('✅ Holistic Detection Active');

    return () => {
      if (holisticRef.current) {
        holisticRef.current.close();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Removed local TFJS state resets
    };
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      setDetectionStatus('✅ Holistic (WS backend)');
    };

    if (!isActive) {
      return;
    }

    loadModel();

    if (useBertBackend && !wsClientRef.current) {
      wsClientRef.current = new ISLBertWSClient({
        url: import.meta?.env?.VITE_ISL_WS_URL,
        onOpen: () => setDetectionStatus((s) => s + ' | 🛰️ WS Connected'),
        onClose: () => setDetectionStatus((s) => s.replace(' | 🛰️ WS Connected', '')),
        onError: () => { },
        onPrediction: (msg) => {
          const score = typeof msg?.score === 'number' ? msg.score : 0;
          const margin = typeof msg?.margin === 'number' ? msg.margin : 0;
          const handFrames = handPresenceRef.current.slice(-40).filter(Boolean).length;
          if (msg?.prediction && score >= MIN_CONFIDENCE && margin >= 0.05 && handFrames >= MIN_HAND_FRAMES_IN_WINDOW) {
            const text = msg.prediction;
            setDetectedText(text);
            speakText(text);
            onTextDetected && onTextDetected(text, msg.class_id);
            onSpeechGenerated && onSpeechGenerated(text);
            lastPredictionAtRef.current = performance.now();
          }
        }
      });
    }

    if (useBertBackend && wsClientRef.current) {
      wsClientRef.current.connect();
    }

    // --- MODEL LOADING LOGIC ---

    // 1. ALPHABET MODEL (ONNX)
    if (mode === 'alphabet' && useClientAlphabetModel) {
      if (!alphabetOnnxBundleRef.current && !isAlphabetOnnxLoadingRef.current) {
        isAlphabetOnnxLoadingRef.current = true;
        removeStatusFlag('🤖 ONNX Ready');
        addStatusFlag('🧠 ONNX Loading');
        alphabetFeatureBufferRef.current = [];

        loadAlphabetOnnxModel(alphabetModelUrl)
          .then((bundle) => {
            alphabetOnnxBundleRef.current = bundle;
            removeStatusFlag('🧠 ONNX Loading');
            removeStatusFlag('❌ ONNX Error');
            addStatusFlag('🤖 ONNX Ready');
          })
          .catch((error) => {
            console.error('❌ Failed to load alphabet ONNX model:', error);
            alphabetOnnxBundleRef.current = null;
            removeStatusFlag('🧠 ONNX Loading');
            addStatusFlag('❌ ONNX Error');
          })
          .finally(() => {
            isAlphabetOnnxLoadingRef.current = false;
          });
      }
    } else {
      // If not in alphabet mode, we don't need to report ONNX status for it
      // But we keep the model in memory for fast switching if already loaded
      if (mode !== 'alphabet') {
        removeStatusFlag('🤖 ONNX Ready');
        removeStatusFlag('🧠 ONNX Loading');
      }
    }

    // 2. WORD MODEL (LSTM ONNX)
    // Load if in phrases mode OR if we just want it ready (user requested Word Mode default)
    if (mode === 'phrases' || (mode === 'alphabet' && useClientAlphabetModel)) {
      // Note: We might want to keep it loaded even in alphabet mode if memory permits, 
      // but for now let's ensure it's loaded when needed.
      if (!lstmOnnxBundleRef.current && !isLstmOnnxLoadingRef.current) {
        isLstmOnnxLoadingRef.current = true;
        removeStatusFlag('📝 LSTM Ready');
        addStatusFlag('📚 LSTM Loading');
        lstmSequenceBufferRef.current = [];

        loadLstmOnnxModel('/onnx_models/lstm_model.onnx')
          .then((bundle) => {
            lstmOnnxBundleRef.current = bundle;
            removeStatusFlag('📚 LSTM Loading');
            removeStatusFlag('❌ LSTM Error');
            addStatusFlag('📝 LSTM Ready');
            console.log('✅ LSTM model loaded successfully');

            // If in phrases mode, set status immediately
            if (mode === 'phrases') {
              setDetectionStatus('✅ Word Mode Active');
            }
          })
          .catch((error) => {
            console.error('❌ Failed to load LSTM ONNX model:', error);
            lstmOnnxBundleRef.current = null;
            removeStatusFlag('📚 LSTM Loading');
            addStatusFlag('❌ LSTM Error');
          })
          .finally(() => {
            isLstmOnnxLoadingRef.current = false;
          });
      } else if (lstmOnnxBundleRef.current && mode === 'phrases') {
        // If already loaded and we switched back to phrases
        addStatusFlag('📝 LSTM Ready');
        setDetectionStatus('✅ Word Mode Active');
      }
    }

    // 3. LEGACY WS ALPHABET (Fallback)
    if (mode === 'alphabet' && !useClientAlphabetModel) {
      // ... existing WS logic ...
      removeStatusFlag('🤖 ONNX Ready');
      removeStatusFlag('🧠 ONNX Loading');
      removeStatusFlag('❌ ONNX Error');

      if (!islAlphabetWsRef.current) {
        console.log('🔤 Initializing ISL Alphabet WS for mode:', mode);
        islAlphabetWsRef.current = new ISLAlphabetWSClient({
          url: import.meta?.env?.VITE_ISL_ALPHABET_WS_URL || 'ws://localhost:8765',
          onOpen: () => {
            console.log('✅ ISL Alphabet WS Connected');
            addStatusFlag('🔤 Alphabet WS Connected');
            removeStatusFlag('❌ Alphabet WS Error');
          },
          onClose: () => {
            console.log('🔌 ISL Alphabet WS Disconnected');
            removeStatusFlag('🔤 Alphabet WS Connected');
            removeStatusFlag('❌ Alphabet WS Error');
          },
          onError: (error) => {
            console.error('❌ ISL Alphabet WS Error:', error);
            removeStatusFlag('🔤 Alphabet WS Connected');
            addStatusFlag('❌ Alphabet WS Error');
          },
          onPrediction: (prediction) => {
            console.log('📥 ISL Alphabet Prediction received:', prediction);
            // Update global debug state for UI (WebSocket path)
            window.lastAlphaPred = {
              label: prediction.letter || (prediction.raw_prediction || 'Unknown'),
              probability: prediction.confidence || 0
            };
            if (prediction.letter && prediction.confidence >= 0.6) {
              const letter = prediction.letter;
              const confidence = prediction.confidence;

              const letterChanged = lastSpokenLetterRef.current !== letter;
              const now = performance.now();
              const cooldownExpired = now - lastSpokenTimeRef.current > TTS_COOLDOWN_MS;

              console.log(`✅ Detected letter: ${letter} (confidence: ${confidence.toFixed(3)}, hand: ${prediction.handedness})`);
              setDetectedText(`${letter} (${(confidence * 100).toFixed(1)}%)`);

              if (letterChanged || cooldownExpired) {
                speakText(letter); // Ensure speakText is defined or use handle function
                lastSpokenLetterRef.current = letter;
                lastSpokenTimeRef.current = now;
                onSpeechGenerated && onSpeechGenerated(letter);
                console.log(`🔊 Spoke letter "${letter}"`);

                if (clearTrackingTimeoutRef.current) {
                  clearTimeout(clearTrackingTimeoutRef.current);
                }
                clearTrackingTimeoutRef.current = setTimeout(() => {
                  console.log(`🧹 Clearing UI display for "${letter}" - ready for new letter`);
                  setDetectedText('');
                  clearTrackingTimeoutRef.current = null;
                }, 500);
              } else {
                console.log(`🔇 Skipping TTS - same letter "${letter}" already spoken (cooldown: ${(now - lastSpokenTimeRef.current).toFixed(0)}ms)`);
              }

              onAlphabetLetter && onAlphabetLetter(letter);
              onTextDetected && onTextDetected(letter, prediction.class_id);
              lastAlphabetPredictionAtRef.current = now;
            } else if (prediction.raw_prediction) {
              console.log(`⚠️ Low confidence prediction: ${prediction.raw_prediction} (${prediction.confidence.toFixed(3)})`);
            }
          }
        });
      }

      if (islAlphabetWsRef.current && !islAlphabetWsRef.current.isConnected) {
        islAlphabetWsRef.current.connect();
      }
    } else {
      // Cleanup WS if not in use
      if (islAlphabetWsRef.current) {
        islAlphabetWsRef.current.disconnect();
        islAlphabetWsRef.current = null;
      }
      removeStatusFlag('🔤 Alphabet WS Connected');
    }
  }, [isActive, mode, useClientAlphabetModel, alphabetModelUrl, useBertBackend, onAlphabetLetter, onSpeechGenerated, onTextDetected]);

  const processFrame = async () => {
    try {
      const video = webcamRef.current?.video;
      if (video && video.readyState >= 2 && holisticRef.current && isActiveRef.current) {
        await holisticRef.current.send({ image: video });
      }
    } catch (error) {
    } finally {
      rafIdRef.current = requestAnimationFrame(processFrame);
    }
  };

  useEffect(() => {
    if (canvasRef.current && isActive) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('TEST', 10, 50);
        console.log('🧪 Test pattern drawn on canvas');
      }
    }
  }, [isActive]);

  useEffect(() => {
    isActiveRef.current = isActive;
    console.log('🔄 VideoWithPoseDetection: isActive changed to:', isActive);

    if (!isActive) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Clear tracking timeout
      if (clearTrackingTimeoutRef.current) {
        clearTimeout(clearTrackingTimeoutRef.current);
        clearTrackingTimeoutRef.current = null;
      }

      // Reset TTS tracking when deactivated
      lastSpokenLetterRef.current = null;
      lastSpokenTimeRef.current = 0;
      alphabetFeatureBufferRef.current = [];
      isAlphabetOnnxBusyRef.current = false;
      lstmSequenceBufferRef.current = []; // Clear LSTM sequence buffer
      isLstmOnnxBusyRef.current = false;

      setDetectedText('');
      setIsProcessing(false);
      setCurrentHands([]);
      setDetectionStatus('⏸️ Gesture Detection Paused');

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
      if (islAlphabetWsRef.current) {
        islAlphabetWsRef.current.disconnect();
      }
    } else {
      setDetectionStatus('✅ Holistic (WS backend)');
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(processFrame);
      }
      if (useBertBackend && wsClientRef.current && !wsClientRef.current.isConnected) {
        wsClientRef.current.connect();
      }
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive && canvasRef.current && canvasRef.current.width > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        console.log('🧹 Canvas cleared - detection inactive');
      }
    }
  }, [isActive]);

  return (
    <div className="relative w-full h-full">
      <Webcam
        ref={webcamRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 9,
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
        mirrored={true}
        onUserMedia={(stream) => {
          if (!streamSentRef.current && stream && onStreamReady) {
            onStreamReady(stream);
            streamSentRef.current = true;
          }
        }}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 640,
          height: 480,
          facingMode: "user"
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          textAlign: "center",
          zIndex: 10,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          objectFit: "cover"
        }}
      />

      {isActive && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs z-20">
          <div className="font-medium flex items-center gap-2">
            {(detectionStatus === 'initializing' || detectionStatus.includes('Retrying') || detectionStatus.includes('Loading')) && <Loader size="small" color="#FFFFFF" />}
            {detectionStatus === 'initializing' ? 'Initializing...' : detectionStatus}
          </div>

          {detectedText && (
            <div className="mt-1 text-green-400 text-xs">
              Detected: {detectedText}
            </div>
          )}

          {detectionStatus.includes('❌') && (
            <button
              onClick={() => {
                setDetectionStatus('⏳ Retrying...');
              }}
              className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Retry
            </button>
          )}

          {/* DEBUG INFO */}
          <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-gray-300">
            <div>Face: {hasFaceDetected ? '✅' : '❌'} {mode === 'alphabet' ? '(Ignored)' : ''}</div>
            <div>Movement: {isMoving ? '🏃 MOVING' : '🧍 STATIC'}</div>

            {/* Conditional LSTM/Alpha Status */}
            {mode === 'phrases' ? (
              <div className="truncate">LSTM: {window.lastLstmPred ? `${window.lastLstmPred.label} (${(window.lastLstmPred.probability * 100).toFixed(0)}%)` : 'Waiting...'}</div>
            ) : (
              <div className="truncate text-gray-500">LSTM: Idle (Alphabet Mode)</div>
            )}

            {mode === 'alphabet' ? (
              <div className="truncate">
                Alpha: {
                  window.lastAlphaPred
                    ? `${window.lastAlphaPred.label} (${(window.lastAlphaPred.probability * 100).toFixed(0)}%)`
                    : (currentHands.length > 0 ? 'Waiting...' : '⚠️ No Hands Detected')
                }
              </div>
            ) : (
              <div className="truncate text-gray-500">Alpha: Idle (Word Mode)</div>
            )}
          </div>
        </div>
      )}
      {/* Alphabet mode removed for sign->text */}
      <div className="text-xs text-gray-300">Toggle on to enable sign detection</div>
    </div>
  )
}


export default VideoWithPoseDetection;