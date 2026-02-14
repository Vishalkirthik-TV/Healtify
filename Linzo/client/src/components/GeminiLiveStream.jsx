import React, { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

/**
 * GeminiLiveStream Component (Geometric Streaming Mode)
 * Uses MediaPipe Hands to extract landmarks (x, y, z) clientside.
 * Streams LIGHTWEIGHT JSON coordinates to Gemini via Vertex AI.
 * 
 * Features:
 * - 🛡️ Privacy: No video leaves the device.
 * - ⚡ Latency: Extremely low (sending text tokens, not pixels/audio).
 * - 📉 Quota: negligible bandwidth.
 * - 🧠 Buffer: Buffers frames to provide temporal context (300ms chunks).
 */
const GeminiLiveStream = ({
    isActive,
    onTextDetected,
    socketRef,
    roomId
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState("Initializing MP...");
    const [error, setError] = useState(null);

    // Buffer for accumulating frames
    const frameBufferRef = useRef([]);
    const lastSendTimeRef = useRef(0);
    const handsMeshRef = useRef(null);
    const cameraRef = useRef(null);

    // Configuration
    const BUFFER_SIZE_MS = 600; // Buffer ~600ms of context
    const SEND_INTERVAL_MS = 500; // Send batch every 500ms
    const MIN_FRAMES_TO_SEND = 5;

    useEffect(() => {
        let hands = null;
        let camera = null;

        const onResults = (results) => {
            if (!canvasRef.current || !videoRef.current) return;

            // Draw landmarks for local feedback (optional/debug)
            const ctx = canvasRef.current.getContext('2d');
            ctx.save();
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

            // 1. Process Detection
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                setStatus("Hands Detected 👐");

                // Extract lightweight coordinates (Wrist-Relative Normalization)
                // We map only what Gemini needs: relative x, y, z for each hand
                const validHands = results.multiHandLandmarks.map((landmarks, index) => {
                    // 1. Find Wrist (Root)
                    const wrist = landmarks[0];

                    // 2. Normalize all points relative to Wrist
                    // This makes the sign "Position Invariant" (User can move hand anywhere)
                    return {
                        handIndex: index,
                        landmarks: landmarks.map(lm => ({
                            x: Number((lm.x - wrist.x).toFixed(3)),
                            y: Number((lm.y - wrist.y).toFixed(3)),
                            z: Number((lm.z - wrist.z).toFixed(3))
                        }))
                    };
                });

                const frameData = {
                    timestamp: Date.now(),
                    hands: validHands
                };

                // 2. Buffer Frames
                frameBufferRef.current.push(frameData);

                // Draw Visuals
                const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = window;
                // Note: We might need to import drawing_utils dynamically or use simple loop if not verified
                // For now, simpler drawing manually or assuming drawing_utils loaded globally if script tag used.
                // Since we installed via npm, we should use the importedUtils if accessible, 
                // but let's stick to simple circle drawing for robustness if imports fail.

                for (const landmarks of results.multiHandLandmarks) {
                    for (const point of landmarks) {
                        ctx.beginPath();
                        ctx.arc(point.x * canvasRef.current.width, point.y * canvasRef.current.height, 3, 0, 2 * Math.PI);
                        ctx.fillStyle = '#00FF00';
                        ctx.fill();
                    }
                }

            } else {
                setStatus("Waiting for Hands...");
                // Note: If no hands, we do NOT buffer empty frames, effectively pausing the "video" to Gemini.
            }
            ctx.restore();

            // 3. Check Send Condition
            const now = Date.now();
            if (now - lastSendTimeRef.current > SEND_INTERVAL_MS) {
                sendBuffer();
            }
        };

        const sendBuffer = () => {
            if (frameBufferRef.current.length < MIN_FRAMES_TO_SEND) return;

            if (socketRef.current) {
                // Construct Payload
                const payload = {
                    mimeType: "application/json", // Special mimeType for our backend handler
                    data: JSON.stringify({
                        type: "HAND_LANDMARKS",
                        frames: frameBufferRef.current
                    }) // Sending as stringified JSON
                };

                console.log(`📤 Sending ${frameBufferRef.current.length} frames to Gemini`);
                socketRef.current.emit('gemini-stream-data', payload);

                // Clear Buffer
                frameBufferRef.current = [];
                lastSendTimeRef.current = Date.now();
            }
        };

        const initMediaPipe = async () => {
            try {
                hands = new Hands({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                    }
                });

                hands.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                hands.onResults(onResults);
                handsMeshRef.current = hands;

                if (videoRef.current) {
                    camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            if (hands && videoRef.current) {
                                await hands.send({ image: videoRef.current });
                            }
                        },
                        width: 320,
                        height: 240
                    });
                    cameraRef.current = camera;
                    camera.start();
                    console.log("📸 MediaPipe Camera Started");
                }
            } catch (err) {
                console.error("MediaPipe Init Error:", err);
                setError("Failed to load Hand Tracking");
            }
        };

        if (isActive) {
            initMediaPipe();
            if (socketRef.current) {
                // Re-emit start for context (optional, signaling handles duplicates)
                socketRef.current.emit('start-gemini-stream', { roomId });
            }
        }

        return () => {
            if (hands) hands.close();
            if (camera) camera.stop();
        };
    }, [isActive, socketRef, roomId]);

    // Handle Incoming Audio (PCM Streaming)
    useEffect(() => {
        if (!socketRef.current) return;

        // 1. Initialize Audio Context (Standard Gemini Rate is 24kHz)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        let nextStartTime = 0;

        const handleAudio = async (data) => {
            if (data.audio) {
                try {
                    // Resume context if suspended (browser autoplay policy)
                    if (audioCtx.state === 'suspended') {
                        await audioCtx.resume();
                    }

                    // 2. Decode Base64 -> Raw PCM (Int16)
                    const binaryString = window.atob(data.audio);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const int16Data = new Int16Array(bytes.buffer);

                    // 3. Convert Int16 -> Float32 (Web Audio API format)
                    const float32Data = new Float32Array(int16Data.length);
                    for (let i = 0; i < int16Data.length; i++) {
                        float32Data[i] = int16Data[i] / 32768.0; // Normalize to -1.0 -> 1.0
                    }

                    // 4. Create Buffer
                    const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
                    buffer.getChannelData(0).set(float32Data);

                    // 5. Schedule Playback (Gapless)
                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioCtx.destination);

                    // Ensure we schedule after the current "tail"
                    const currentTime = audioCtx.currentTime;
                    if (nextStartTime < currentTime) {
                        nextStartTime = currentTime;
                    }
                    source.start(nextStartTime);

                    // Update next start time
                    nextStartTime += buffer.duration;

                } catch (e) {
                    console.error("PCM Audio Decode Error:", e);
                }
            }
        };

        socketRef.current.on('gemini-audio', handleAudio);
        return () => {
            socketRef.current.off('gemini-audio', handleAudio);
            if (audioCtx) audioCtx.close();
        };
    }, [socketRef]);

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-inner border border-gray-800">
            {/* Hidden Video Feed (Source) */}
            <video
                ref={videoRef}
                className="hidden"
                playsInline
                muted
            />

            {/* Debug Canvas (Visual Feedback) */}
            <canvas
                ref={canvasRef}
                width={320} height={240}
                className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* Status Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status.includes("Wait") ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                    {error || status}
                </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <p className="text-white/50 text-[10px] uppercase tracking-widest font-mono">
                    GEOMETRIC STREAMING • JSON
                </p>
            </div>
        </div>
    );
};

export default GeminiLiveStream;
