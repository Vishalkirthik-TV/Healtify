require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ No API Key found");
        return;
    }

    console.log("🔑 Testing Key: " + apiKey.substring(0, 5) + "...");

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            return;
        }

        if (!data.models) {
            console.log("⚠️ No models returned. Response:", data);
            return;
        }

        console.log("✅ API Key Works! Available Models:");
        data.models.forEach(m => {
            if (m.name.includes("gemini")) {
                console.log(`- ${m.name.replace('models/', '')}`);
            }
        });

    } catch (error) {
        console.error("❌ Network/Fetch Error:", error.message);
    }
}

listModels();
