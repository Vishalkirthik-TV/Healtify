import WebSocket from 'ws';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const LOCATION = 'us-central1';
const PUBLISHER = 'google';
const MODEL_ID = 'gemini-live-2.5-flash-native-audio'; // Targeted Vertex Live Model

class GeminiLiveService {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId; // Room ID for broadcasting
        this.ws = null;
        this.isConnected = false;
        this.projectId = null;
        this.authClient = null;
    }

    async connect() {
        if (this.isConnected) return;

        try {
            console.log('☁️ Initializing Vertex AI Auth...');

            // 1. Authenticate using the Service Account Key
            const auth = new GoogleAuth({
                keyFile: './vertex-key.json',
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });

            this.authClient = await auth.getClient();
            this.projectId = await auth.getProjectId();
            const accessToken = await this.authClient.getAccessToken();
            const token = accessToken.token;

            console.log(`🔑 Authenticated as Project: ${this.projectId}`);

            // 2. Construct Vertex WebSocket URL
            const host = `${LOCATION}-aiplatform.googleapis.com`;
            const uri = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

            console.log('🔌 Connecting to Vertex AI Live API...');

            // 3. Connect with Bearer Token in Headers
            this.ws = new WebSocket(uri, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            this.ws.on('open', () => {
                console.log('✅ Connected to Vertex AI Live API');
                this.isConnected = true;
                this.sendSetupMessage();
            });

            this.ws.on('message', (data) => this.handleMessage(data));

            this.ws.on('error', (err) => {
                // Ignore closing errors
                if (this.ws?.readyState === WebSocket.CLOSING || this.ws?.readyState === WebSocket.CLOSED) return;
                console.error('❌ Vertex WebSocket Error:', err.message);
                try {
                    this.socket.emit('gemini-error', { message: 'AI Connection Error' });
                } catch (e) { }
            });

            this.ws.on('close', (code, reason) => {
                console.log(`🔌 Disconnected from Vertex (Code: ${code}, Reason: ${reason})`);
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ Failed to connect to Vertex AI:', error.message);
            this.socket.emit('gemini-error', { message: 'Failed to authenticate with Vertex AI' });
        }
    }

    sendSetupMessage() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const modelResourceName = `projects/${this.projectId}/locations/${LOCATION}/publishers/${PUBLISHER}/models/${MODEL_ID}`;

        const setupMsg = {
            setup: {
                model: modelResourceName,
                generationConfig: {
                    responseModalities: ["AUDIO"] // Native Audio Model requires AUDIO specific modality
                },
                systemInstruction: {
                    parts: [{
                        text: "You are an expert Indian Sign Language (ISL) interpreter. You will receive a stream of JSON data representing 'Hand Landmarks' from MediaPipe. \n\nIMPORTANT: The coordinates are WRIST-RELATIVE. \n- The Wrist (Point 0) is the origin (0,0,0). \n- All other finger points are relative to the wrist. \n- Focus on the RELATIVE positions of fingertips to infer the hand shape (e.g., Open Palm, Fist, Pinch).\n\nYOUR VOCABULARY KNOWLEDGE:\n1. **Fingerspelling**: You MUST recognize standard ISL/ASL fingerspelling for A-Z (Alphabets) and 0-9 (Numbers). if detecting a sequence, spell it out.\n2. **Core Signs**: Look for: 'Actor', 'Bed', 'Dream', 'Dress', 'Evening', 'Friend', 'Good Morning', 'Happy', 'Hello', 'How are you', 'Loud', 'Pleased', 'Thank You', 'They'.\n\nCRITICAL SILENCE RULES:\n- If the hands are RESTING, STATIC, or the user is not signing, output NOTHING. \n- NEVER say 'no action', 'noaction', 'nothing', or 'silence'. \n- Strictly output ONLY the translation.\n- If you are unsure, remain silent."
                    }]
                }
            }
        };

        this.ws.send(JSON.stringify(setupMsg));
        console.log(`📤 Sent Setup for Model: ${modelResourceName}`);
    }

    handleMessage(data) {
        try {
            const response = JSON.parse(data.toString());

            // Handle Audio Output (inlineData)
            if (response.serverContent?.modelTurn?.parts) {
                const parts = response.serverContent.modelTurn.parts;
                for (const part of parts) {
                    if (part.text) {
                        const cleanText = part.text.trim();
                        // FILTER: Ignore "no action" or empty/garbage outputs
                        if (!cleanText ||
                            cleanText.toLowerCase().includes('no action') ||
                            cleanText.toLowerCase().includes('noaction') ||
                            cleanText.toLowerCase() === 'silence') {
                            console.log('🔇 Filtered Ignored Output:', cleanText);
                            continue;
                        }

                        console.log('🗣️ Gemini Vertex:', cleanText);
                        this.socket.emit('gemini-response', { text: cleanText });
                        // Also broadcast text to room for subtitles
                        if (this.roomId) {
                            this.socket.to(this.roomId).emit('gemini-response', { text: cleanText, sender: this.socket.id });
                        }
                    }
                    if (part.inlineData) {
                        console.log('🗣️ Gemini Audio (Base64 Received) -> Broadcasting to Room');

                        const audioPayload = {
                            audio: part.inlineData.data,
                            mimeType: part.inlineData.mimeType,
                            sender: this.socket.id
                        };

                        // 1. Send to Sender (Client can choose to mute or play)
                        this.socket.emit('gemini-audio', audioPayload);

                        // 2. Broadcast to Room (Remote Participants hear this!)
                        if (this.roomId) {
                            this.socket.to(this.roomId).emit('gemini-audio', audioPayload);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('❌ Error parsing Vertex message:', e);
        }
    }

    send(data) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        try {
            // Handle JSON Text Data (Coordinate Stream)
            if (data.mimeType === "application/json") {
                const textPayload = data.data; // This is the JSON string

                // Send as a Text Turn (clientContent)
                const msg = {
                    clientContent: {
                        turns: [
                            {
                                role: "user",
                                parts: [{ text: textPayload }]
                            }
                        ],
                        turnComplete: true // Mark as complete to trigger response
                    }
                };
                this.ws.send(JSON.stringify(msg));

            } else {
                // Handle Binary Media (Legacy Video/Audio)
                const msg = {
                    realtimeInput: {
                        mediaChunks: [
                            {
                                mimeType: data.mimeType,
                                data: data.data // Base64 string
                            }
                        ]
                    }
                };
                this.ws.send(JSON.stringify(msg));
            }
        } catch (e) {
            console.error('Failed to send frame to Vertex:', e);
        }
    }

    disconnect() {
        if (this.ws) {
            try {
                this.ws.removeAllListeners();
                this.ws.on('error', () => { });
                this.ws.close();
            } catch (e) { }
            this.ws = null;
            this.isConnected = false;
        }
    }
}

export default GeminiLiveService;
