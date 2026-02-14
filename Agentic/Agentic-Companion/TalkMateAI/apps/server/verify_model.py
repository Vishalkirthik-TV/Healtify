
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ GEMINI_API_KEY not found!")
    exit(1)

genai.configure(api_key=api_key)

model_name = "gemini-flash-latest"
print(f"Testing model: {model_name}...")

try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hello, can you hear me?")
    print(f"✅ Success! Response: {response.text}")
except Exception as e:
    print(f"❌ Failed to load {model_name}: {e}")
    
    print("\nAvailable models:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
