import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const SpeechRecognitionComponent = ({ 
  onTextChange, 
  isListening = false, 
  onListeningChange,
  language = 'en-US'
}) => {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  // Check if speech recognition is supported
  useEffect(() => {
    try {
      // Test if the browser supports speech recognition
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        setIsSupported(false);
        setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
    } catch (err) {
      setIsSupported(false);
      setError('Speech recognition failed to initialize: ' + err.message);
    }
  }, []);

  const {
    transcript: recognitionTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    language: language
  });

  useEffect(() => {
    if (recognitionTranscript !== transcript) {
      setTranscript(recognitionTranscript);
      if (onTextChange) {
        onTextChange(recognitionTranscript);
      }
    }
  }, [recognitionTranscript, transcript, onTextChange]);

  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(listening);
    }
  }, [listening, onListeningChange]);

  const startListening = () => {
    try {
      setError('');
      setIsActive(true);
      SpeechRecognition.startListening({ 
        continuous: true, 
        language: language,
        interimResults: true 
      });
    } catch (err) {
      setError('Failed to start speech recognition: ' + err.message);
    }
  };

  const stopListening = () => {
    try {
      setIsActive(false);
      SpeechRecognition.stopListening();
    } catch (err) {
      setError('Failed to stop speech recognition: ' + err.message);
    }
  };

  const clearTranscript = () => {
    try {
      resetTranscript();
      setTranscript('');
      setInterimTranscript('');
      if (onTextChange) {
        onTextChange('');
      }
    } catch (err) {
      setError('Failed to clear transcript: ' + err.message);
    }
  };

  // If not supported, show error message
  if (!isSupported || !browserSupportsSpeechRecognition) {
    return (
      <div style={{
        padding: '16px',
        background: '#f8d7da',
        color: '#721c24',
        borderRadius: '8px',
        border: '1px solid #f5c6cb',
        margin: '16px 0'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Speech Recognition Not Available</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
          {error || 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'}
        </p>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          <strong>Alternative:</strong> Use the text input below to type your message.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      margin: '16px 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h4 style={{ margin: 0, color: '#495057' }}>
          Speech Recognition
        </h4>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={startListening}
            disabled={listening}
            style={{
              padding: '8px 16px',
              background: listening ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: listening ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {listening ? 'Listening...' : 'Start Listening'}
          </button>
          
          <button
            onClick={stopListening}
            disabled={!listening}
            style={{
              padding: '8px 16px',
              background: !listening ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !listening ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Stop Listening
          </button>
          
          <button
            onClick={clearTranscript}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '8px 12px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          border: '1px solid #f5c6cb',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontWeight: '500',
            color: '#495057'
          }}>
            Current Text:
          </label>
          <textarea
            value={transcript}
            readOnly
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
            placeholder="Speech will appear here..."
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: listening ? '#28a745' : '#dc3545',
            animation: listening ? 'pulse 1.5s infinite' : 'none'
          }} />
          <span style={{
            fontSize: '14px',
            color: '#6c757d'
          }}>
            Status: {listening ? 'Listening' : 'Stopped'}
          </span>
        </div>

        {listening && (
          <div style={{
            padding: '8px 12px',
            background: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            border: '1px solid #c3e6cb',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            🎤 Speak now! Your words will be translated to sign language in real-time.
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default SpeechRecognitionComponent;
