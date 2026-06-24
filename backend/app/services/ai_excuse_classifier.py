import os
import requests

GROK_API_KEY = os.getenv("GROK_API_KEY")

CATEGORIES = [
    "Medical",
    "Family Emergency",
    "Busy / Work",
    "Transportation Issue",
    "Personal Reason",
    "Out of Station / Travel",
    "Other / Unclear"
]


def classify_excuse(transcript: str) -> str:
    try:
        if not transcript or transcript.strip() == "":
            return "Other / Unclear"

        prompt = f"""
Classify the following student absence excuse into ONE category only.

Categories:
{', '.join(CATEGORIES)}

Excuse:
{transcript}

Return ONLY the category name.
"""

        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "grok-3-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0
            },
            timeout=30
        )

        response.raise_for_status()

        result = response.json()

        category = (
            result["choices"][0]["message"]["content"]
            .strip()
        )

        if category not in CATEGORIES:
            return "Other / Unclear"

        return category

    except Exception as e:
        print("Classification Error:", e)
        return "Other / Unclear"