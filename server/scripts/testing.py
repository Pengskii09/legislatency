from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).resolve().parent.parent.parent / "server" / ".env")

from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="What is today's date?"
    )
    print(response.text)
except Exception as e:
    err = str(e)
    if "429" in err:
        print("Quota reached.")
    else:
        print("Unavailable.")