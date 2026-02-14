import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

# Force UTF-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ No API Key found")
    exit(1)

genai.configure(api_key=api_key)

print(f"Checking models for API key: {api_key[:5]}...")

try:
    print("\nAvailable Models:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"❌ Error listing models: {e}")