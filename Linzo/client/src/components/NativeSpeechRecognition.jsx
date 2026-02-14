import React, { useState, useEffect, useRef } from 'react';

const NativeSpeechRecognition = ({
  onTextChange,
  onListeningChange,
  onFinalResult,
  language = 'en-US'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [isAutoStarted, setIsAutoStarted] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const recognitionRef = useRef(null);
  const transcriptTimeoutRef = useRef(null);
  const autoStartTimeoutRef = useRef(null);

  // Use refs for callbacks to avoid stale closures in event listeners
  const onTextChangeRef = useRef(onTextChange);
  const onListeningChangeRef = useRef(onListeningChange);
  const onFinalResultRef = useRef(onFinalResult);

  // Update refs when props change
  useEffect(() => {
    onTextChangeRef.current = onTextChange;
    onListeningChangeRef.current = onListeningChange;
    onFinalResultRef.current = onFinalResult;
  }, [onTextChange, onListeningChange, onFinalResult]);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      setDebugInfo('Speech recognition is supported');

      try {
        recognitionRef.current = new SpeechRecognition();

        // Configure recognition for instant, real-time performance
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;
        recognitionRef.current.maxAlternatives = 1;

        // Event handlers
        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          setDebugInfo('Speech recognition started successfully');
          setIsListening(true);
          if (onListeningChangeRef.current) onListeningChangeRef.current(true);
          setError('');
          setConfidence(0);
        };

        recognitionRef.current.onend = () => {
          console.log('🛑 SPEECH RECOGNITION ENDED');
          setDebugInfo('Speech recognition ended');
          setIsListening(false);
          if (onListeningChangeRef.current) onListeningChangeRef.current(false);

          // Auto-restart if it was supposed to be running
          if (isAutoStarted && recognitionRef.current) {
            console.log('🔄 Attempting auto-restart...');
            setDebugInfo('Auto-restarting speech recognition...');
            autoStartTimeoutRef.current = setTimeout(() => {
              if (recognitionRef.current && isAutoStarted) {
                try {
                  recognitionRef.current.start();
                  console.log('▶️ Auto-restarted speech recognition');
                  setDebugInfo('Auto-restart successful');
                } catch (e) {
                  console.error('❌ Failed to restart speech recognition:', e);
                  setDebugInfo('Auto-restart failed: ' + e.message);
                }
              }
            }, 100);
          }
        };

        recognitionRef.current.onresult = (event) => {
          console.log('Speech recognition result:', event);
          setDebugInfo('Received speech result');

          let finalTranscript = '';
          let interimTranscript = '';
          let highestConfidence = 0;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i][0];
            const transcript = result.transcript;
            const confidence = result.confidence || 0;

            console.log(`Result ${i}:`, { transcript, confidence, isFinal: event.results[i].isFinal });

            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              highestConfidence = Math.max(highestConfidence, confidence);
            } else {
              interimTranscript += transcript;
            }
          }

          // Update confidence for visual feedback
          setConfidence(highestConfidence);

          // ZERO-DELAY processing - immediate updates for real-time experience
          if (finalTranscript) {
            console.log('🎤 Final result chunk:', finalTranscript);
            if (onFinalResultRef.current) onFinalResultRef.current(finalTranscript);
          } else if (interimTranscript) {
            // Pass interim results for live feedback / avatar
            if (onTextChangeRef.current) onTextChangeRef.current(interimTranscript);
          }
          setDebugInfo('Processing final transcript: ' + finalTranscript);

          // Instant processing - no delays, no timeouts
          const newTranscript = transcript + ' ' + finalTranscript;
          const cleanTranscript = newTranscript.trim();
          setTranscript(cleanTranscript);

          // Immediate callback for instant sign language translation
          if (onTextChangeRef.current) {
            onTextChangeRef.current(cleanTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setDebugInfo('Speech recognition error: ' + event.error);

          // Handle specific errors gracefully
          if (event.error === 'no-speech') {
            setDebugInfo('No speech detected, restarting...');
            // Auto-restart for no-speech errors
            if (isAutoStarted) {
              setTimeout(() => {
                try {
                  if (recognitionRef.current) {
                    recognitionRef.current.start();
                    setDebugInfo('Restarted after no-speech error');
                  }
                } catch (err) {
                  console.log('Auto-restart after no-speech failed:', err);
                  setDebugInfo('Failed to restart after no-speech: ' + err.message);
                }
              }, 1000);
            }
          } else if (event.error === 'audio-capture') {
            setError('Microphone access denied. Please allow microphone access and try again.');
            setDebugInfo('Microphone access denied');
          } else if (event.error === 'network') {
            setError('Network error. Please check your internet connection.');
            setDebugInfo('Network error');
          } else {
            setError(`Speech recognition error: ${event.error}`);
            setDebugInfo('Unknown error: ' + event.error);
          }

          setIsListening(false);
          if (onListeningChangeRef.current) onListeningChangeRef.current(false);
        };

        setDebugInfo('Speech recognition configured successfully');

      } catch (err) {
        console.error('Error setting up speech recognition:', err);
        setError('Failed to setup speech recognition: ' + err.message);
        setDebugInfo('Setup error: ' + err.message);
      }

    } else {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setDebugInfo('Speech recognition not supported');
    }

    return () => {
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // Depend only on stable props to prevent re-init loops

  // Auto-start speech recognition when component mounts
  useEffect(() => {
    if (isSupported && !isAutoStarted) {
      setDebugInfo('Auto-starting speech recognition in 1 second...');
      // Small delay to ensure everything is ready
      const startDelay = setTimeout(() => {
        startListening();
        setIsAutoStarted(true);
      }, 1000);

      return () => clearTimeout(startDelay);
    }
  }, [isSupported, isAutoStarted]);

  const startListening = () => {
    try {
      if (recognitionRef.current && !isListening) {
        setError(''); // Clear any previous errors
        setDebugInfo('Starting speech recognition...');
        recognitionRef.current.start();
        setIsAutoStarted(true);
      } else {
        setDebugInfo('Cannot start: recognition not ready or already listening');
      }
    } catch (err) {
      setError('Failed to start speech recognition: ' + err.message);
      setDebugInfo('Start error: ' + err.message);
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsAutoStarted(false);
        setDebugInfo('Stopped speech recognition');
      }
    } catch (err) {
      setError('Failed to stop speech recognition: ' + err.message);
      setDebugInfo('Stop error: ' + err.message);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setConfidence(0);
    if (onTextChangeRef.current) {
      onTextChangeRef.current('');
    }
    setDebugInfo('Transcript cleared');
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 mb-4">
        <h4 className="text-lg font-semibold mb-3">Speech Recognition Not Available</h4>
        <p className="text-sm mb-3">
          {error || 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'}
        </p>
        <div className="text-xs opacity-80">
          <span className="font-semibold">Alternative:</span> Use the text input below to type your message.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-700 mb-2">
          🎤 Automatic Voice-to-Sign Language
        </h4>
        <div className="flex gap-2">
          <button
            onClick={startListening}
            disabled={isListening}
            className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${isListening
              ? 'bg-green-500 text-white cursor-not-allowed shadow-lg'
              : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md active:scale-95'
              }`}
          >
            {isListening ? '🎤 Active' : '🎤 Start'}
          </button>

          <button
            onClick={stopListening}
            disabled={!isListening}
            className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${!isListening
              ? 'bg-gray-500 text-white cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md active:scale-95'
              }`}
          >
            ⏹️ Stop
          </button>

          <button
            onClick={clearTranscript}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hover:shadow-md active:scale-95 transition-all duration-200"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded-md border border-red-200 mb-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Live Speech Translation:
          </label>
          <textarea
            value={transcript}
            readOnly
            className="w-full min-h-20 p-3 border border-green-300 rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-inner"
            placeholder="🎤 Just speak naturally - your words will be instantly translated to sign language..."
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isListening ? 'bg-green-500' : 'bg-red-500'
              }`} />
            <span className="text-sm text-gray-600">
              Status: {isListening ? '🎤 Listening & Translating' : '⏸️ Stopped'}
            </span>
          </div>

          {confidence > 0 && (
            <div className="text-xs text-green-600 font-medium">
              Confidence: {Math.round(confidence * 100)}%
            </div>
          )}
        </div>

        {isListening && (
          <div className="p-3 bg-green-50 text-green-800 rounded-md border border-green-200 text-sm text-center animate-pulse">
            🎤 <strong>Speak now!</strong> Your voice is being instantly translated to sign language.
            <br />
            <span className="text-xs opacity-80">No buttons needed - just talk naturally!</span>
          </div>
        )}

        {!isListening && transcript && (
          <div className="p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200 text-sm text-center">
            💡 <strong>Ready to translate!</strong> Click "Start" to begin automatic voice recognition.
          </div>
        )}

        <div className="p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200 text-sm">
          💡 <strong>How it works:</strong>
          <br />
          • Speech recognition starts automatically when you join
          <br />
          • Just speak naturally - no need to press buttons
          <br />
          • 3D avatar instantly translates your words to sign language
          <br />
          • Works continuously for seamless communication
        </div>

        {/* Debug Information */}
        <div className="p-3 bg-gray-50 text-gray-700 rounded-md border border-gray-200 text-xs font-mono">
          🔍 <strong>Debug Info:</strong> {debugInfo}
        </div>
      </div>
    </div>
  );
};

export default NativeSpeechRecognition;
