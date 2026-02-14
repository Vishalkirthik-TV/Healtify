// ISL Alphabet Detection WebSocket Client
// Connects to Python WebSocket server for alphabet/number prediction

export class ISLAlphabetWSClient {
  constructor({ url, onOpen, onClose, onError, onPrediction }) {
    this.url = url || 'ws://localhost:8765';
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.onPrediction = onPrediction;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔌 ISL Alphabet WS: Already connected');
      return;
    }

    try {
      console.log(`🔌 ISL Alphabet WS: Connecting to ${this.url}`);
      console.log('🔌 ISL Alphabet WS: WebSocket URL:', this.url);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('✅ ISL Alphabet WS: Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.onOpen && this.onOpen();
      };

      this.ws.onclose = (event) => {
        console.log('🔌 ISL Alphabet WS: Disconnected', event.code, event.reason);
        this.isConnected = false;
        this.ws = null;
        this.onClose && this.onClose();
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ ISL Alphabet WS: Error', error);
        this.onError && this.onError(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 ISL Alphabet WS: Received', data);
          
          if (data.type === 'prediction_result' && data.data) {
            this.onPrediction && this.onPrediction(data.data);
          } else if (data.type === 'error') {
            console.error('❌ ISL Alphabet WS: Server error', data.message);
            this.onError && this.onError(new Error(data.message));
          } else if (data.type === 'pong') {
            console.log('🏓 ISL Alphabet WS: Pong received');
          }
        } catch (e) {
          console.error('❌ ISL Alphabet WS: Failed to parse message', e);
        }
      };

    } catch (e) {
      console.error('❌ ISL Alphabet WS: Connection failed', e);
      this.onError && this.onError(e);
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`🔄 ISL Alphabet WS: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    console.log('🔌 ISL Alphabet WS: Disconnecting');
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    if (this.ws) {
      try { 
        this.ws.close(1000, 'Manual disconnect'); 
      } catch (e) {
        console.warn('⚠️ ISL Alphabet WS: Error during disconnect', e);
      }
      this.ws = null;
      this.isConnected = false;
    }
  }

  sendPredictionRequest(landmarks, handedness = 'unknown', timestamp = null) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ ISL Alphabet WS: Not connected, cannot send prediction request');
      return false;
    }

    try {
      const message = {
        type: 'prediction',
        landmarks: landmarks,
        handedness: handedness,
        timestamp: timestamp || Date.now()
      };

      console.log('📤 ISL Alphabet WS: Sending prediction request', {
        landmarksCount: landmarks.length,
        handedness: handedness,
        timestamp: message.timestamp
      });

      this.ws.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error('❌ ISL Alphabet WS: Failed to send prediction request', e);
      return false;
    }
  }

  sendPing() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message = {
        type: 'ping',
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error('❌ ISL Alphabet WS: Failed to send ping', e);
      return false;
    }
  }

  updateConfig(config) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ ISL Alphabet WS: Not connected, cannot update config');
      return false;
    }

    try {
      const message = {
        type: 'config',
        config: config
      };
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error('❌ ISL Alphabet WS: Failed to update config', e);
      return false;
    }
  }
}

// Utility function to extract hand landmarks from MediaPipe results - matching isl_detection.py
export function extractHandLandmarks(mediaPipeResults, handSide = 'unknown') {
  let landmarks = [];
  
  // Extract landmarks based on hand side - MediaPipe Holistic returns arrays directly
  if (handSide === 'left' && mediaPipeResults.leftHandLandmarks && mediaPipeResults.leftHandLandmarks.length === 21) {
    // Extract 21 landmarks from left hand (MediaPipe returns array of 21 objects directly)
    landmarks = mediaPipeResults.leftHandLandmarks.map(landmark => [landmark.x, landmark.y]).flat();
  } else if (handSide === 'right' && mediaPipeResults.rightHandLandmarks && mediaPipeResults.rightHandLandmarks.length === 21) {
    // Extract 21 landmarks from right hand (MediaPipe returns array of 21 objects directly)
    landmarks = mediaPipeResults.rightHandLandmarks.map(landmark => [landmark.x, landmark.y]).flat();
  } else {
    // Try to detect which hand is present
    if (mediaPipeResults.leftHandLandmarks && mediaPipeResults.leftHandLandmarks.length === 21) {
      landmarks = mediaPipeResults.leftHandLandmarks.map(landmark => [landmark.x, landmark.y]).flat();
      handSide = 'left';
    } else if (mediaPipeResults.rightHandLandmarks && mediaPipeResults.rightHandLandmarks.length === 21) {
      landmarks = mediaPipeResults.rightHandLandmarks.map(landmark => [landmark.x, landmark.y]).flat();
      handSide = 'right';
    }
  }

  // Ensure we have exactly 42 values (21 landmarks × 2 coordinates)
  if (landmarks.length !== 42) {
    console.warn(`⚠️ Expected 42 landmarks, got ${landmarks.length} for hand ${handSide}`);
    console.warn(`MediaPipe results:`, {
      hasLeft: !!mediaPipeResults.leftHandLandmarks,
      hasRight: !!mediaPipeResults.rightHandLandmarks,
      leftLength: mediaPipeResults.leftHandLandmarks?.length,
      rightLength: mediaPipeResults.rightHandLandmarks?.length
    });
    return { landmarks: [], handSide: 'unknown' };
  }

  return { landmarks, handSide };
}

// Utility function to determine hand side from MediaPipe handedness
export function getHandSide(handedness) {
  if (!handedness || !handedness.classification || !handedness.classification[0]) {
    return 'unknown';
  }
  
  const label = handedness.classification[0].label;
  return label.toLowerCase();
}