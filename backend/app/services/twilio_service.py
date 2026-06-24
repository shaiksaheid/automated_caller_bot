from twilio.rest import Client
import os
from urllib.parse import quote

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
from_number = os.getenv("TWILIO_PHONE_NUMBER")
base_url = os.getenv("PUBLIC_BASE_URL").rstrip("/")

client = Client(account_sid, auth_token)

def make_call(to_number: str, student_id: int):
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        url=f"{base_url}/calls/voice?student_id={student_id}",
        method="POST",
        status_callback=f"{base_url}/calls/status?student_id={student_id}",
        status_callback_event=["completed"],
        status_callback_method="POST"
    )
    return call.sid



def make_bulk_call(to_number: str, message: str):
    base_url = "https://automated-caller-bot-1.onrender.com"  

    # ✅ ENCODE MESSAGE
    encoded_message = quote(message)

    voice_url = f"{base_url}/calls/custom-voice?message={encoded_message}"

    call = client.calls.create(
        to=to_number,
        from_=from_number,
        url=voice_url
    )

    return call.sid







def send_sms(to_number: str, message: str):
    message = client.messages.create(
        body=message,
        from_=from_number,
        to=to_number
    )
    return message.sid
