from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import date

from app.services.twilio_service import make_call
from app.database.db import SessionLocal
from app.database.models import Attendance, Student

from app.database.models import CallLog
from datetime import datetime
from fastapi import APIRouter, Depends, Request

from fastapi import Request
from datetime import datetime
from app.database.models import CallLog

from fastapi.responses import StreamingResponse
from app.services.twilio_service import client
import requests

from app.services.transcription_service import transcribe_audio

from app.services.ai_excuse_classifier import classify_excuse

from app.services.flagging_service import check_and_flag_student


from fastapi import Request
from app.database.models import CallLog
from sqlalchemy.orm import Session
from app.database.db import get_db
from fastapi import Depends


router = APIRouter(
    prefix="/calls",
    tags=["Calls"]
)

# -------------------------------
# Database Dependency
# -------------------------------


# -------------------------------
# TWILIO VOICE WEBHOOK (MAIN FLOW)
# -------------------------------
@router.post("/voice", include_in_schema=False)
async def voice(request: Request):
    student_id = request.query_params.get("student_id")

    base_url = "https://automated-caller-bot-1.onrender.com"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        Good morning.
        We are calling from CMR Technical Campus.
        Your ward has been absent today.
        Please tell the valid reason after the beep.
    </Say>

    <Record
        maxLength="10"
        playBeep="true"
        action="{base_url}/calls/thank-you"
        method="POST"
        recordingStatusCallback="{base_url}/calls/recording?student_id={student_id}"
        recordingStatusCallbackMethod="POST"
    />
</Response>
"""
    return Response(content=twiml, media_type="text/xml")

# -------------------------------
# AFTER RECORDING COMPLETES
# -------------------------------
@router.post("/thank-you", include_in_schema=False)
async def thank_you():
    twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        Thank you for your response.
    </Say>
    <Hangup/>
</Response>
"""
    return Response(content=twiml, media_type="text/xml")

@router.post("/recording", include_in_schema=False)
async def save_recording(request: Request):

    form = await request.form()

    recording_url = form.get("RecordingUrl")
    call_sid = form.get("CallSid")
    student_id = request.query_params.get("student_id")

    if not recording_url or not call_sid or not student_id:
        return {"status": "ignored"}

    db = SessionLocal()

    try:
        # 🔎 Fetch existing log (created earlier via status webhook)
        log = db.query(CallLog).filter(
            CallLog.call_sid == call_sid
        ).first()

        if not log:
            # Safety fallback
            log = CallLog(
                student_id=int(student_id),
                call_sid=call_sid,
                call_date=date.today()
            )
            db.add(log)
            db.flush()

        # 🎧 Save recording
        log.recording_url = recording_url + ".mp3"

        # 🎯 STEP 1: TRANSCRIPTION
        transcript = transcribe_audio(
            recording_url=log.recording_url,
            call_sid=log.call_sid
        )

        if transcript and transcript.strip():

            log.transcript_text = transcript.strip()

            # 🎯 STEP 2: CATEGORY (AI-based)
            category = classify_excuse(log.transcript_text)
            log.excuse_category = category

            # 🎯 STEP 3: RISK ENGINE
            from app.services.risk_service import calculate_risk
            risk_level = calculate_risk(
                student_id=log.student_id,
                category=category,
                db=db
            )

            log.risk_level = risk_level

        else:
            # 🚨 No response case
            log.transcript_text = "No Response"
            log.excuse_category = "No Response"
            log.risk_level = "HIGH"

        db.commit()

        # 🔥 STEP 4: AUTO SMS ALERT (After Commit)
        if log.risk_level == "HIGH":

            from app.services.twilio_service import send_sms
            from app.database.models import Student

            student = db.query(Student).filter(
                Student.id == log.student_id
            ).first()

            if student and student.parent_phone:
                sms_text = (
                    "ALERT: Multiple high-risk absences detected. "
                    f"Category: {log.excuse_category}. "
                    "Please contact college administration."
                )

                send_sms(student.parent_phone, sms_text)

    except Exception as e:
        db.rollback()
        print("Recording processing error:", str(e))

    finally:
        db.close()

    return {
        "status": "recording processed",
        "call_sid": call_sid
    }


# -------------------------------
# TRIGGER CALLS FOR ABSENT STUDENTS
# -------------------------------
@router.post("/call-absent")
def call_absent_students(
    attendance_date: date,
    db: Session = Depends(get_db)
):
    """
    Initiates calls for all students marked ABSENT on a given date.
    """

    absentees = db.query(Attendance).filter(
        Attendance.date == attendance_date,
        Attendance.status == "ABSENT"
    ).all()

    call_results = []

    for record in absentees:
        student = db.query(Student).filter(
            Student.id == record.student_id
        ).first()

        if not student:
            continue

        call_sid = make_call(
            to_number=student.parent_phone,
            student_id=student.id
        )

        call_results.append({
            "student_id": student.id,
            "call_sid": call_sid
        })

    return {
        "total_calls_started": len(call_results),
        "calls": call_results
    }


@router.post("/status", include_in_schema=False)
async def call_status(
    request: Request,
    db: Session = Depends(get_db)
):

    form = await request.form()

    call_sid = form.get("CallSid")
    status = form.get("CallStatus")
    duration = form.get("CallDuration")

    log = db.query(CallLog).filter(
        CallLog.call_sid == call_sid
    ).first()

    if not log:
        return {"message": "Call log not found"}

    # Only update final statuses
    if status == "completed":
        log.call_status = "COMPLETED"

        if duration:
            log.call_duration = int(duration)

    elif status == "busy":
        log.call_status = "BUSY"

    elif status == "no-answer":
        log.call_status = "NO_ANSWER"

    db.commit()

    return {"message": "Call status updated"}

    log = db.query(CallLog).filter(
        CallLog.call_sid == call_sid
    ).first()

    if log:
        log.call_status = status_map[status]

        if duration:
            log.call_duration = int(duration)

        db.commit()

    return {"message": "Call status updated"}

@router.get("/recording/{call_sid}")
def stream_recording(call_sid: str):
    """
    Securely stream Twilio recording audio to UI
    """

    recording = (
        client.recordings
        .list(call_sid=call_sid, limit=1)
    )

    if not recording:
        return {"error": "Recording not found"}

    audio_url = f"https://api.twilio.com{recording[0].uri.replace('.json', '.mp3')}"

    r = requests.get(audio_url, auth=(client.username, client.password), stream=True)

    return StreamingResponse(
        r.iter_content(chunk_size=1024),
        media_type="audio/mpeg"
    )


@router.get("/transcript/{call_sid}")
def get_transcript(call_sid: str, db: Session = Depends(get_db)):
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()

    if not log:
        return {"transcript": None}

    return {
        "transcript": log.transcript_text
    }



@router.post("/call-student")
def call_single_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    from app.database.models import Student
    from app.services.twilio_service import make_call

    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        return {"error": "Student not found"}

    call_sid = make_call(
        to_number=student.parent_phone,
        student_id=student.id
    )

    return {
        "message": "Call initiated",
        "student_id": student.id,
        "call_sid": call_sid
    }





@router.post("/custom-voice", include_in_schema=False)
async def custom_voice(request: Request):
    message = request.query_params.get("message", "Hello from college")

    twiml = f"""
<Response>
    <Say voice="alice">{message}</Say>
</Response>
"""
    return Response(content=twiml, media_type="text/xml")