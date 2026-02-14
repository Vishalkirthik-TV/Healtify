require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer
const upload = multer({ dest: 'uploads/' });

// Serve uploads statically for sharing
app.use('/uploads', express.static('uploads'));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to convert file to GenerativePart
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType
        },
    };
}

app.post('/api/triage', upload.single('image'), async (req, res) => {
    console.log('Received triage request:', req.body);

    if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        You are an expert dermatologist AI assistant for a triage application. 
        Analyze the attached image of a skin condition along with the patient's self-reported symptoms.
        
        Patient Symptoms:
        - Description: ${req.body.description}
        - Duration: ${req.body.duration}
        - Pain Level (0-10): ${req.body.painLevel}
        - Fever: ${req.body.hasFever === 'true' ? "Yes" : "No"}
        - History: ${req.body.hasHistory === 'true' ? "Yes" : "No"}

        Provide a structured JSON response with the following fields:
        1. risk_level: "Low", "Moderate", or "High"
        2. likely_category: A brief category (e.g., "Inflammatory", "Infectious", "Suspicious Lesion", "Benign")
        3. confidence_score: A number between 0-100 indicating your confidence in the assessment.
        4. reasoning: An array of 3-4 short, clear bullet points explaining your assessment based on visual features (color, border, texture) and symptoms.
        5. recommended_action: A short action plan (e.g., "Self-care", "Book appointment", "Urgent Care").
        6. safety_note: A standard medical disclaimer tailored to the risk.

        IMPORTANT Requirements:
        - DO NOT provide a specific medical diagnosis (e.g., do not say "Melanoma" or "Eczema"). Use descriptive categories.
        - If risk is High or fever is present, recommended_action must be "Urgent Care" or "Consult Doctor Immediately".
        - Return ONLY raw JSON. No markdown formatting.
        `;

        const imagePart = fileToGenerativePart(req.file.path, req.file.mimetype);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        // Cleanup file
        fs.unlinkSync(req.file.path);

        res.json(data);

    } catch (error) {
        console.error("Error processing with Gemini:", error);
        // Improved Error Handling: Pass specific error details if safe, or generic message
        res.status(500).json({
            error: "AI Analysis Failed",
            details: error.message
        });

        // Cleanup file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

app.get('/', (req, res) => {
    res.send('DermSight Backend (Gemini Powered) is running');
});

// Routes
const chatRoute = require('./routes/chat');
const authRoute = require('./routes/auth');
const emergencyRoute = require('./routes/emergency');

app.use('/api', chatRoute);
app.use('/api/auth', authRoute);
app.use('/api/emergency', emergencyRoute); // Emergency Services

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
