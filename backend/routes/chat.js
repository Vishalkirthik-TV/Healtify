
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
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            chatSessions[sessionId] = {
                chat: model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{
                                text: `
                                You are "DermSight AI", a compassionate and expert dermatologist companion.
                                Your primary goal is to triage skin conditions using the patient's medical context and the current symptoms they present (via images, audio, or text).
                                
                                ### PATIENT DATABASE CONTEXT:
                                ${historyPrompt}
                                
                                ### OPERATIONAL RULES:
                                1. **Context Awareness**: Use the "Patient Medical History" and "Medical Report Context" above to personalize your questions and assessments.
                                2. **Record Summary**: If the patient asks "What do you know about my history?" or "What's in my report?", provide a concise summary based ONLY on the context provided above.
                                3. **Single Interaction**: Ask ONE clear, relevant question at a time to keep the triage focused.
                                4. **Multimodal Analysis**: Silently analyze any provided images or audio. If an image shows a lesion and the medical history mentions "Eczema", consider this connection in your Assessment, but do not provide a definitive diagnosis.
                                5. **JSON Output**: You MUST ALWAYS respond in valid JSON format according to the schema below.
                                
                                ### JSON SCHEMA:
                                {
                                  "reply": "Conversational text to be spoken to the patient.",
                                  "assessment": {
                                    "risk": "Low" | "Moderate" | "High",
                                    "confidence": number (0-100),
                                    "redFlags": string[],
                                    "escalate": boolean
                                  }
                                }

                                IMPORTANT: If the user provides a clinical report, leverage its findings (e.g., specific medications or past diagnoses) to ask more targeted triage questions.
                            ` }]
                        },
                        {
                            role: "model",
                            parts: [{ text: JSON.stringify({ reply: "Understood. I have reviewed your medical history context. I am ready to triage. Please show me the affected area or describe your symptoms." }) }]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 250,
                    },
                }),
                lastActive: Date.now()
            };
        }

        const chatSession = chatSessions[sessionId].chat;
        let mediaPart;

        const imageFile = req.files?.['image']?.[0];
        const audioFile = req.files?.['audio']?.[0];

        const parts = [];
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
            console.log("Analyzing attached audio...");
            // Expo default 'm4a' is usually AAC. 
            // Gemini accepts 'audio/aac'.
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
            console.log("Calling Gemini API with multimodal input...");
            const startTime = Date.now();

            // Use the constructed parts array which contains text, image, and/or audio
            const result = await chatSession.sendMessage(parts);
            const response = await result.response;
            const rawText = response.text();

            console.log(`[Gemini] Raw Response: ${rawText}`);

            let parsed;
            try {
                // Remove Markdown code blocks if model includes them
                const cleanJson = rawText.replace(/```json|```/g, "").trim();
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                console.error("Failed to parse Gemini JSON. Raw:", rawText);
                parsed = { reply: rawText, assessment: null };
            }

            console.log(`[Gemini] Response received in ${Date.now() - startTime}ms`);

            res.json({
                reply: parsed.reply || "I'm processing that.",
                assessment: parsed.assessment,
                sessionId: sessionId
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
