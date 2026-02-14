
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Service to handle batch video analysis using Gemini 1.5 Flash.
 * Receives a sequence of frames and returns the sign language translation.
 */
class GeminiBatchService {
    constructor() {
        // Use Gemini Flash Latest (verified from user list)
        this.model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: "You are a professional Sign Language Interpreter. I will provide a sequence of video frames. Analyze the entire sequence as a single sentence. Output ONLY the English translation. Consolidate repetitive gestures into a single meaning (e.g., 'YOU YOU YOU' -> 'YOU'). Use concise, natural spoken English. If no clear sign is detected, output '...'."
        });
    }

    async analyzeSequence(frames) {
        if (!frames || frames.length === 0) {
            return null;
        }

        console.log(`🧠 Gemini Batch: Analyzing ${frames.length} frames...`);

        try {
            // Convert base64 frames to Gemini's Part format
            const imageParts = frames.map(base64Data => ({
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            }));

            // Create the prompt parts: [Images..., Text Prompt]
            // We append a specific reinforcement instruction at the end
            const promptParts = [
                ...imageParts,
                { text: "Translate this sign language sequence into English text." }
            ];

            const result = await this.model.generateContent(promptParts);
            const response = await result.response;
            const text = response.text();

            console.log('🗣️ Gemini Batch Result:', text);
            return text;

        } catch (error) {
            console.error('❌ Gemini Batch Error:', error);
            if (error.message?.includes('429')) {
                throw new Error('QUOTA_EXCEEDED');
            }
            throw error;
        }
    }
}

export default new GeminiBatchService();
