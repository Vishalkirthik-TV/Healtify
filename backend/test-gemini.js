require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log("Testing 'gemini-2.0-flash'...");
        const result = await model.generateContent("Say 'Hello from Gemini 2.0'");
        console.log("Response:", result.response.text());
        console.log("✅ Success!");
    } catch (error) {
        console.error("❌ Failed:", error.message);
    }
}

testGemini();
