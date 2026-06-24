from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.models import CallLog
from sqlalchemy import func
from app.database.models import CallLog, Student
from datetime import date, timedelta
from datetime import date, timedelta
from sqlalchemy import func
from app.database.models import CallLog
from datetime import date
from calendar import monthrange
from fastapi.responses import FileResponse
from app.services.report_service import generate_daily_report
from sqlalchemy.orm import joinedload
from app.database.models import CallLog, Student
from sqlalchemy.orm import joinedload
from app.database.models import Attendance
from fastapi import HTTPException
from datetime import datetime
from app.database.models import Student
from fastapi import Body
from fastapi import HTTPException, Body
from twilio.rest import Client
from datetime import datetime, date as dt_date
from app.services.twilio_service import make_bulk_call
from app.database.models import BulkCampaign


router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/flagged-students")
def get_flagged_students(db: Session = Depends(get_db)):
    results = (
        db.query(
            CallLog.student_id,
            CallLog.risk_level
        )
        .filter(CallLog.risk_level.isnot(None))
        .distinct(CallLog.student_id, CallLog.risk_level)
        .all()
    )

    return [
        {
            "student_id": r.student_id,
            "risk_level": r.risk_level
        }
        for r in results
    ]


@router.get("/flagged-students")
def get_flagged_students(db: Session = Depends(get_db)):

    flagged = db.query(CallLog).filter(
        CallLog.risk_level.in_(["HIGH", "MEDIUM"])
    ).order_by(
        CallLog.risk_level.desc(),  # HIGH first
        CallLog.created_at.desc()
    ).all()

    results = []

    for log in flagged:
        results.append({
            "student_id": log.student_id,
            "call_sid": log.call_sid,
            "category": log.excuse_category,
            "risk_level": log.risk_level,
            "transcript": log.transcript_text,
            "date": log.call_date
        })

    return {
        "total_flagged": len(results),
        "students": results
    }

@router.get("/student/{student_id}/history")
def student_excuse_history(student_id: int, db: Session = Depends(get_db)):
    logs = (
        db.query(CallLog)
        .filter(CallLog.student_id == student_id)
        .order_by(CallLog.created_at.desc())
        .all()
    )

    return [
        {
            "call_sid": log.call_sid,
            "excuse_category": log.excuse_category,
            "risk_level": log.risk_level,
            "date": log.call_date
        }
        for log in logs
    ]

@router.get("/summary")
def admin_summary(db: Session = Depends(get_db)):

    today = date.today()

    # 📞 Total Calls
    total_calls = db.query(func.count(CallLog.id)).scalar() or 0

    # 🎧 Recorded Calls
    total_recorded = db.query(func.count(CallLog.id)).filter(
        CallLog.recording_url.isnot(None)
    ).scalar() or 0

    # 🧠 Category Breakdown
    category_stats = (
        db.query(
            CallLog.excuse_category,
            func.count(CallLog.id)
        )
        .group_by(CallLog.excuse_category)
        .all()
    )

    # Default 7 categories (adjust if needed)
    category_data = {
        "Medical": 0,
        "Family Emergency": 0,
        "Personal Work": 0,
        "Travel": 0,
        "Function/Event": 0,
        "No Response": 0,
        "Other": 0
    }

    for category, count in category_stats:
        key = category if category else "Other"
        category_data[key] = count

    # 🚩 Risk Breakdown (FIXED VERSION)
    risk_data = {
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }

    risk_stats = (
        db.query(
            CallLog.risk_level,
            func.count(CallLog.id)
        )
        .group_by(CallLog.risk_level)
        .all()
    )

    for risk, count in risk_stats:
        level = risk if risk else "LOW"
        risk_data[level] = count

    # 🔥 High Risk Students
    high_risk_students = db.query(func.count(CallLog.id)).filter(
        CallLog.risk_level == "HIGH"
    ).scalar() or 0

    # 📅 Today's Calls
    today_calls = db.query(func.count(CallLog.id)).filter(
        CallLog.call_date == today
    ).scalar() or 0

    return {
        "total_calls": total_calls,
        "total_recorded": total_recorded,
        "today_calls": today_calls,
        "high_risk_cases": high_risk_students,
        "category_breakdown": category_data,
        "risk_breakdown": risk_data
    }


@router.get("/weekly-trend")
def weekly_trend(db: Session = Depends(get_db)):

    seven_days_ago = date.today() - timedelta(days=7)

    results = (
        db.query(
            CallLog.call_date,
            func.count(CallLog.id)
        )
        .filter(CallLog.call_date >= seven_days_ago)
        .group_by(CallLog.call_date)
        .order_by(CallLog.call_date)
        .all()
    )

    trend = [
        {"date": str(date), "count": count}
        for date, count in results
    ]

    return {"weekly_trend": trend}


@router.get("/risk-percentage")
def risk_percentage(db: Session = Depends(get_db)):

    total = db.query(func.count(CallLog.id)).scalar() or 1

    stats = (
        db.query(
            CallLog.risk_level,
            func.count(CallLog.id)
        )
        .group_by(CallLog.risk_level)
        .all()
    )

    percentage_data = {}

    for level, count in stats:
        key = level if level else "LOW"
        percentage_data[key] = round((count / total) * 100, 2)

    return percentage_data


@router.get("/top-risk-students")
def top_risk_students(db: Session = Depends(get_db)):

    results = (
        db.query(
            CallLog.student_id,
            func.count(CallLog.id).label("risk_count")
        )
        .filter(CallLog.risk_level == "HIGH")
        .group_by(CallLog.student_id)
        .order_by(func.count(CallLog.id).desc())
        .limit(5)
        .all()
    )

    data = [
        {
            "student_id": student_id,
            "high_risk_cases": count
        }
        for student_id, count in results
    ]

    return {"top_risk_students": data}


@router.get("/high-risk-students")
def high_risk_students(db: Session = Depends(get_db)):

    students = (
        db.query(
            CallLog.student_id,
            func.count(CallLog.id).label("high_risk_count")
        )
        .filter(CallLog.risk_level == "HIGH")
        .group_by(CallLog.student_id)
        .order_by(func.count(CallLog.id).desc())
        .all()
    )

    return [
        {
            "student_id": s.student_id,
            "high_risk_cases": s.high_risk_count
        }
        for s in students
    ]


@router.get("/weekly-risk-trend")
def weekly_risk_trend(db: Session = Depends(get_db)):

    seven_days_ago = date.today() - timedelta(days=7)

    stats = (
        db.query(
            CallLog.risk_level,
            func.count(CallLog.id)
        )
        .filter(CallLog.call_date >= seven_days_ago)
        .group_by(CallLog.risk_level)
        .all()
    )

    return {
        risk if risk else "Unknown": count
        for risk, count in stats
    }


@router.get("/top-excuses")
def top_excuses(db: Session = Depends(get_db)):

    stats = (
        db.query(
            CallLog.excuse_category,
            func.count(CallLog.id)
        )
        .group_by(CallLog.excuse_category)
        .order_by(func.count(CallLog.id).desc())
        .all()
    )

    return {
        category if category else "Uncategorized": count
        for category, count in stats
    }


@router.get("/risk-trend")
def risk_trend(db: Session = Depends(get_db)):

    seven_days_ago = date.today() - timedelta(days=7)

    results = (
        db.query(
            CallLog.call_date,
            func.avg(CallLog.risk_score)
        )
        .filter(
            CallLog.call_date >= seven_days_ago,
            CallLog.risk_score.isnot(None)
        )
        .group_by(CallLog.call_date)
        .order_by(CallLog.call_date)
        .all()
    )

    trend_data = [
        {
            "date": str(row[0]),
            "average_risk_score": round(float(row[1]), 2)
        }
        for row in results
    ]

    return {
        "last_7_days_risk_trend": trend_data
    }


@router.get("/student-risk-timeline/{student_id}")
def student_risk_timeline(student_id: int, db: Session = Depends(get_db)):

    logs = (
        db.query(CallLog)
        .filter(CallLog.student_id == student_id)
        .order_by(CallLog.call_date)
        .all()
    )

    timeline = []

    for log in logs:
        timeline.append({
            "date": str(log.call_date),
            "risk_score": log.risk_score,
            "risk_level": log.risk_level,
            "category": log.excuse_category,
            "has_recording": True if log.recording_url else False
        })

    return {
        "student_id": student_id,
        "total_records": len(timeline),
        "risk_timeline": timeline
    }


@router.get("/risk-heatmap")
def risk_heatmap(month: int, year: int, db: Session = Depends(get_db)):

    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    logs = (
        db.query(CallLog)
        .filter(CallLog.call_date >= start_date)
        .filter(CallLog.call_date <= end_date)
        .all()
    )

    heatmap_data = {}

    for log in logs:
        day_key = str(log.call_date)

        if day_key not in heatmap_data:
            heatmap_data[day_key] = {
                "risk_score": 0,
                "risk_level": "LOW",
                "calls": 0
            }

        heatmap_data[day_key]["calls"] += 1
        heatmap_data[day_key]["risk_score"] += log.risk_score or 0

        # Escalate risk if HIGH exists
        if log.risk_level == "HIGH":
            heatmap_data[day_key]["risk_level"] = "HIGH"
        elif log.risk_level == "MEDIUM" and heatmap_data[day_key]["risk_level"] != "HIGH":
            heatmap_data[day_key]["risk_level"] = "MEDIUM"

    return heatmap_data


@router.get("/risk-leaderboard")
def risk_leaderboard(db: Session = Depends(get_db)):

    results = (
        db.query(
            CallLog.student_id,
            func.avg(CallLog.risk_score).label("avg_score"),
            func.count(CallLog.id).label("total_calls")
        )
        .filter(CallLog.risk_score.isnot(None))
        .group_by(CallLog.student_id)
        .order_by(func.avg(CallLog.risk_score).desc())
        .all()
    )

    leaderboard = []

    for student_id, avg_score, total_calls in results:

        # Get highest risk level for student
        highest_risk = (
            db.query(CallLog.risk_level)
            .filter(CallLog.student_id == student_id)
            .order_by(
                CallLog.risk_level.desc()
            )
            .first()
        )

        leaderboard.append({
            "student_id": student_id,
            "average_risk_score": round(float(avg_score), 2),
            "highest_risk_level": highest_risk[0] if highest_risk else "LOW",
            "total_calls": total_calls
        })

    return leaderboard

@router.get("/daily-risk-check")
def daily_risk_check(db: Session = Depends(get_db)):

    from app.services.daily_alert_service import check_daily_risk_and_alert

    # Replace with real admin number later
    admin_phone = "+918885882321"

    result = check_daily_risk_and_alert(db, admin_phone)

    return result




@router.get("/daily-report")
def daily_report(report_date: date, db: Session = Depends(get_db)):

    filepath = generate_daily_report(db, report_date)

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filepath.split("/")[-1]
    )





@router.get("/call-logs")
def get_call_logs(db: Session = Depends(get_db)):

    logs = (
        db.query(CallLog)
        .options(joinedload(CallLog.student))
        .order_by(CallLog.id.desc())
        .all()
    )

    result = []

    for log in logs:
        student = log.student

        result.append({
    "id": log.id,
    "student_id": log.student_id,
    "student_name": log.student.name if log.student else "Unknown",
    "parent_name": log.student.parent_name if log.student else "Unknown",
    "parent_phone": log.student.parent_phone if log.student else "Unknown",
    "call_date": str(log.call_date),
    "call_time": str(log.created_at.time()) if log.created_at else None,
    "status": log.call_status,
    "duration": log.call_duration,
    "transcript": log.transcript_text,
    "audio_url": log.recording_url,
    "excuse_category": log.excuse_category
})

    return result



from fastapi.responses import StreamingResponse
import requests
import os


@router.get("/recording/{call_id}")
def get_recording(call_id: int, db: Session = Depends(get_db)):

    log = db.query(CallLog).filter(CallLog.id == call_id).first()

    if not log or not log.recording_url:
        raise HTTPException(status_code=404, detail="Recording not found")

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")

    response = requests.get(
        log.recording_url,
        auth=(account_sid, auth_token),
        stream=True
    )

    return StreamingResponse(
        response.iter_content(chunk_size=1024),
        media_type="audio/mpeg"
    )



@router.get("/absent-students")
def get_absent_students(date: str, db: Session = Depends(get_db)):

    try:
        selected_date = datetime.strptime(date, "%Y-%m-%d").date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")

    records = (
        db.query(Attendance)
        .options(joinedload(Attendance.student))
        .filter(
            Attendance.date == selected_date,
            Attendance.status == "ABSENT"
        )
        .all()
    )

    return [
        {
            "id": r.student.id,
            "roll_no": r.student.roll_no,
            "name": r.student.name,
            "parent_phone": r.student.parent_phone
        }
        for r in records if r.student
    ]




@router.post("/call-absent")
def call_absent_students(date: str, db: Session = Depends(get_db)):

    try:
        selected_date = datetime.strptime(date, "%Y-%m-%d").date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")

    records = (
        db.query(Attendance)
        .options(joinedload(Attendance.student))
        .filter(
            Attendance.date == selected_date,
            Attendance.status == "ABSENT"
        )
        .all()
    )

    if not records:
        return {"message": "No absent students found"}

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_number = os.getenv("TWILIO_PHONE_NUMBER")

    client = Client(account_sid, auth_token)

    base_url = "https://automated-caller-bot-1.onrender.com"  

    called_students = []

    for record in records:

        student = record.student

        if not student or not student.parent_phone:
            continue

        try:

            call = client.calls.create(
    to=student.parent_phone,
    from_=twilio_number,
    url=f"{base_url}/calls/voice?student_id={student.id}",
    status_callback=f"{base_url}/calls/status",
    status_callback_event=["initiated", "ringing", "answered", "completed"],
    status_callback_method="POST"
)

            log = CallLog(
                student_id=student.id,
                call_sid=call.sid,
                call_status="INITIATED",
                call_date=dt_date.today()   # ✅ FIXED
            )

            db.add(log)

            called_students.append({
                "student_id": student.id,
                "student_name": student.name,
                "parent_phone": student.parent_phone,
                "call_sid": call.sid
            })

        except Exception as e:
            print("Call failed:", e)

    db.commit()

    return {
        "message": "Calling process started",
        "total_called": len(called_students),
        "calls": called_students
    }





# NEW IMPORTS
from fastapi import UploadFile, File, Form
import pandas as pd
from app.database.models import Student
from app.services.twilio_service import make_call

@router.post("/bulk-call")
async def bulk_call(
    campaign_name: str = Form(...),
    message: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # 📂 Read file
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        else:
            df = pd.read_excel(file.file)

        # ✅ Flexible column handling
        if "phone" in df.columns:
            phones = df["phone"].dropna().tolist()
        else:
            phones = df.iloc[:, 0].dropna().tolist()

        phones = [str(p).strip() for p in phones]

        # ✅ CREATE CAMPAIGN ENTRY
        campaign = BulkCampaign(
            campaign_name=campaign_name,
            message=message,
            total_calls=len(phones),
            success_calls=0,
            failed_calls=0,
            status="IN_PROGRESS",
            created_at=datetime.utcnow()
        )

        db.add(campaign)
        db.commit()
        db.refresh(campaign)

        results = []

        # 🔥 PROCESS CALLS
        for phone in phones:
            try:
                call_sid = make_bulk_call(
                    to_number=phone,
                    message=message
                )

                campaign.success_calls += 1

                results.append({
                    "phone": phone,
                    "status": "called",
                    "call_sid": call_sid
                })

            except Exception as e:
                print("❌ TWILIO ERROR:", str(e))

                campaign.failed_calls += 1

                results.append({
                    "phone": phone,
                    "status": "failed",
                    "error": str(e)
                })

            # ✅ UPDATE LIVE PROGRESS
            db.commit()

        # ✅ MARK COMPLETED
        campaign.status = "COMPLETED"
        db.commit()

        return {
            "campaign_id": campaign.id,
            "campaign_name": campaign_name,
            "status": campaign.status,
            "total": campaign.total_calls,
            "success": campaign.success_calls,
            "failed": campaign.failed_calls,
            "details": results
        }

    except Exception as e:
        return {"error": str(e)}
    





@router.get("/bulk-campaigns")
def get_campaigns(db: Session = Depends(get_db)):

    campaigns = db.query(BulkCampaign).order_by(
        BulkCampaign.created_at.desc()
    ).all()

    return [
        {
            "id": c.id,
            "campaignName": c.campaign_name,
            "message": c.message,
            "totalCalls": c.total_calls,
            "completed": c.success_calls,
            "failed": c.failed_calls,
            "status": c.status.lower(),
            "createdAt": c.created_at.strftime("%Y-%m-%d")
        }
        for c in campaigns
    ]




