
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // There isn't a direct listModels on genAI, usually it's manager or we test specific ones.
        // Actually, usually it's via ModelManager or similar, but the simpler JS SDK might not expose it easily 
        // without the admin SDK. 
        // However, let's just try to instantiate a few and see if they work or use a known valid one.

        // Changing approach: minimal test script for commonly known model IDs
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        console.log(`Querying: ${url.replace(apiKey, 'HIDDEN')}`);

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.models) {
                console.log('✅ Available Models:');
                data.models.forEach(m => {
                    if (m.name.includes('flash') || m.name.includes('pro')) {
                        console.log(` - ${m.name} [${m.supportedGenerationMethods.join(', ')}]`);
                    }
                });
            } else {
                console.log('❌ No models found or error:', data);
            }
        } catch (e) {
            console.log('❌ Fetch Error:', e.message);
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

listModels();
