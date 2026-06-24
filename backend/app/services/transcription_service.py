import os
import requests

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
GROK_API_KEY = os.getenv("GROK_API_KEY")


def transcribe_audio(recording_url: str, call_sid: str):
    try:
        # Create temp directory
        os.makedirs("temp", exist_ok=True)

        audio_path = f"temp/{call_sid}.mp3"

        # Download recording from Twilio
        response = requests.get(
            recording_url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            timeout=30
        )
        response.raise_for_status()

        # Save audio file
        with open(audio_path, "wb") as f:
            f.write(response.content)

        # Send audio to Grok
        with open(audio_path, "rb") as audio_file:
            grok_response = requests.post(
                "https://api.x.ai/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}"
                },
                files={
                    "file": audio_file
                },
                data={
                    "model": "grok-1"
                },
                timeout=60
            )

        grok_response.raise_for_status()

        result = grok_response.json()
        text = result.get("text", "").strip()

        # Cleanup temp file
        if os.path.exists(audio_path):
            os.remove(audio_path)

        return text if text else None

    except Exception as e:
        print(f"Grok transcription error: {e}")
        return None