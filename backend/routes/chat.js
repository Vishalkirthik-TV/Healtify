
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require('../models/User');

const upload = multer({ dest: 'uploads/' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat History Store (InMemory for demo)
// In production, use Redis or Database keyed by SessionID
const chatSessions = {};

router.post('/chat', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
    try {
        const { sessionId, message, step, userId } = req.body;
        console.log(`[Chat] Session: ${sessionId}, Step: ${step}, Message: ${message}, User: ${userId}`);

        // Fetch user medical history if userId is provided
        let historyPrompt = "";
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                const mh = user.medicalHistory || {};
                historyPrompt = `
                Patient Medical History:
                - Chronic Conditions: ${mh.chronicConditions?.join(', ') || 'None'}
                - Allergies: ${mh.allergies?.join(', ') || 'None'}
                - Skin Type: ${mh.skinType || 'Unknown'}
                - Past Issues: ${mh.pastIssues || 'None'}

                Medical Report Context:
                ${user.reportMeta?.extractedText ? user.reportMeta.extractedText.substring(0, 2000) : 'No report uploaded.'}
                `;
            }
        }

        // Initialize session if new
        if (!chatSessions[sessionId]) {
            console.log(`[Chat] Initializing new session: ${sessionId}`);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            chatSessions[sessionId] = {
                chat: model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{
                                text: `
                                You are "DermSight AI", a compassionate and expert dermatologist companion.
                                Your primary goal is to triage skin conditions using the patient's medical context and the current symptoms they present.
                                
                                ### OPERATIONAL RULES:
                                1. **Context Awareness**: Use the "Patient Medical History" and "Medical Report Context" provided to personalize your assessments.
                                2. **Record Summary**: If the patient asks about their history or reports, provide a concise summary based ONLY on the provided context.
                                3. **Single Interaction**: Ask ONE clear, relevant question at a time.
                                4. **Multimodal Analysis**: Silently analyze provided images or audio. 
                                 5. **Multilingual Presence**: ALWAYS detect the language used by the patient (e.g., Hindi, Spanish, English). Respond in the SAME language used by the patient. Provide the translation if necessary, but the primary conversational response MUST match the user's language.
                                 6. **JSON Output**: You MUST ALWAYS respond in valid JSON format.
                                 
                                 ### JSON SCHEMA:
                                 {
                                   "reply": "Conversational text in the detected language.",
                                   "language": "ISO 639-1 code (e.g., 'hi', 'es', 'en')",
                                   "assessment": {
                                     "risk": "Low" | "Moderate" | "High",
                                     "confidence": number,
                                     "redFlags": string[],
                                     "escalate": boolean
                                   }
                                 }
                            ` }]
                        },
                        {
                            role: "model",
                            parts: [{ text: JSON.stringify({ reply: "Understood. I'm ready to assist you." }) }]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 250,
                    },
                }),
                lastActive: Date.now(),
                hasContext: false
            };
        }

        const chatSession = chatSessions[sessionId].chat;
        const parts = [];

        // BUNDLE CONTEXT: If userId is now available but context hasn't been injected, prefix it to this message
        if (userId && !chatSessions[sessionId].hasContext && historyPrompt) {
            console.log(`[Chat] Bundling medical context into session ${sessionId}`);
            parts.push({ text: `SYSTEM: Patient Medical History & Report Context found. Use this for all future responses:\n${historyPrompt}\n\nUser Input following below:` });
            chatSessions[sessionId].hasContext = true;
        }
        let mediaPart;

        const imageFile = req.files?.['image']?.[0];
        const audioFile = req.files?.['audio']?.[0];

        if (message) parts.push({ text: message });

        if (imageFile) {
            console.log("Analyzing attached image frame...");
            parts.push({
                inlineData: {
                    data: fs.readFileSync(imageFile.path).toString("base64"),
                    mimeType: imageFile.mimetype
                }
            });
        }

        if (audioFile) {
            console.log(`[Chat] Attaching audio data: ${audioFile.path} (${audioFile.size} bytes)`);
            parts.push({
                inlineData: {
                    data: fs.readFileSync(audioFile.path).toString("base64"),
                    mimeType: "audio/aac"
                }
            });
        }

        console.log(`Sending ${parts.length} parts to Gemini...`);

        // TODO: If audioFile exists, process it (STT) before sending to Gemini
        // For now, we rely on the client sending the mock text message

        try {
            console.log("Calling Gemini API...");
            const startTime = Date.now();

            const result = await chatSession.sendMessage(parts);
            const response = await result.response;
            const rawText = response.text();

            console.log(`[Gemini] Raw Response: ${rawText.substring(0, 200)}...`);
            console.log(`[Gemini] Response received in ${Date.now() - startTime}ms`);

            // Robust JSON Extraction
            let cleanedText = rawText.trim();
            if (cleanedText.includes('```json')) {
                cleanedText = cleanedText.split('```json')[1].split('```')[0].trim();
            } else if (cleanedText.includes('```')) {
                cleanedText = cleanedText.split('```')[1].split('```')[0].trim();
            }

            // Handle cases where there's text before the first '{'
            const firstBrace = cleanedText.indexOf('{');
            const lastBrace = cleanedText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
            }

            const aiResponse = JSON.parse(cleanedText);
            res.json({
                reply: aiResponse.reply || "I'm processing that.",
                assessment: aiResponse.assessment,
                lastActive: Date.now()
            });
        } catch (geminiError) {
            console.error("[Gemini] API ERROR TYPE:", geminiError.constructor.name);
            console.error("[Gemini] API Error Message:", geminiError.message);

            if (geminiError.status === 429) {
                res.json({
                    reply: "I'm currently overwhelmed with requests (Quota Exceeded). Please try again in a minute.",
                    sessionId: sessionId
                });
            } else {
                res.json({
                    reply: "I'm having trouble thinking right now. It might be the connection or the input complexity. Please try again.",
                    sessionId: sessionId
                });
            }
        }
    } catch (error) {
        console.error("Chat Route Error:", error);
        res.status(500).json({ error: "Server Error" });
    } finally {
        // Cleanup uploaded files
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            });
        }
    }
});

module.exports = router;
