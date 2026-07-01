# 📞 AI Powered Automated Caller Bot for Student Attendance & Academic Reporting

An AI-powered full-stack web application that automates student attendance monitoring and parent communication through voice calls. The system enables educational institutions to notify parents instantly about student absences, collect voice responses, analyze excuses using AI, and generate insightful analytics to support academic decision-making.

---

## 🚀 Features

### 👨‍🎓 Student Management

* Add, update, delete, and search students.
* Store student information including roll number, department, parent details, and attendance history.
* Mark daily attendance as Present or Absent.

### 📞 Automated Parent Calling

* Automatically call parents of absent students.
* AI-powered interactive voice conversation using Twilio.
* Voice recording of parent responses.
* Automatic call logging and history tracking.

### 🤖 AI Excuse Analysis

* Speech transcription using AI.
* Automatic excuse classification.
* Risk assessment based on attendance and excuse history.
* Student risk categorization into:

  * 🟢 Low Risk
  * 🟡 Medium Risk
  * 🔴 High Risk

### 📊 Analytics Dashboard

* Total Students
* Present & Absent Statistics
* Call Success Rate
* Attendance Trends
* Risk Distribution
* Common Excuses
* Flagged Students Analysis

### 📂 Call Logs

* View complete call history.
* Search and filter records.
* Download filtered reports as PDF.
* Listen to recorded conversations.

### 📢 Bulk Calling Campaign

* Upload Excel or CSV files.
* Automatically call multiple parents.
* Campaign progress tracking.
* Campaign history management.
* Download sample Excel template.

### 💬 AI Student Assistant

* Search students by Roll Number.
* View:

  * Parent Contact
  * Attendance Percentage
  * Total Absences
  * Risk Level
  * Recent Excuses
  * Call History

### 📄 Reports

* Export PDF Reports
* Daily Attendance Report
* Flagged Students Report
* Call Logs Report
* Attendance Analytics Report

---

# 🛠️ Tech Stack

## Frontend

* React.js
* TypeScript
* Tailwind CSS
* Recharts
* Lucide Icons
* Sonner Toast

## Backend

* FastAPI
* SQLAlchemy ORM
* APScheduler
* Twilio Voice API
* AI-based Speech Processing
* ReportLab

## Database

* PostgreSQL

## AI & Automation

* Grok API
* Twilio Voice
* AI Excuse Classification
* Risk Prediction Engine

---

# 📂 Project Structure

```
AI-Powered-Automated-Caller-Bot/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── database/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env
│
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/shaiksaheid/automated_caller_bot.git
cd automated_caller_bot
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
DATABASE_URL=your_postgresql_database_url

TWILIO_ACCOUNT_SID=xxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

PUBLIC_BASE_URL=https://your-backend-url.onrender.com

GROK_API_KEY=xxxxxxxxxxxxxxxx
```

Run Backend:

```bash
uvicorn app.main:app --reload
```

Backend runs at:

```
http://localhost:8000
```

Swagger API:

```
http://localhost:8000/docs
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```
http://localhost:5173
```

---

# 🌐 Deployment

## Backend

Hosted on Render

```
https://automated-caller-bot-1.onrender.com
```

## Frontend

Hosted on Vercel

```
https://automatedcallerbot.vercel.app
```

---

# 📸 System Modules

* Dashboard
* Student Management
* Attendance Management
* Automated Parent Calling
* Bulk Calling Campaign
* Call Logs
* Risk Analysis
* Analytics Dashboard
* AI Student Chatbot
* PDF Reports

---

# 📈 Workflow

1. Admin marks attendance.
2. Absent students are identified.
3. Parent receives an automated voice call.
4. Parent provides the reason for absence.
5. AI transcribes the response.
6. Excuse is categorized.
7. Student risk score is updated.
8. Call logs are stored.
9. Analytics dashboards are refreshed.
10. Reports can be downloaded.

---

# 🔒 Key Features

* Secure PostgreSQL Database
* Automated Voice Calling
* AI-based Excuse Analysis
* Attendance Monitoring
* Parent Communication
* Bulk Campaign Management
* Risk Prediction
* PDF Report Generation
* Real-Time Dashboard
* Interactive Analytics

---

# 🚀 Future Enhancements

* Multi-language Voice Support
* WhatsApp Notifications
* SMS Alerts
* Mobile Application
* ERP Integration
* AI Attendance Prediction
* Email Notifications
* Real-time Faculty Dashboard

---

# 👨‍💻 Developed By

**Shaik Shaheid**

B.Tech – Computer Science & Engineering (AI & ML)

---

# 📄 License

This project is developed for educational and research purposes. Feel free to use and extend it with appropriate attribution.

---

## ⭐ If you found this project useful, don't forget to star the repository!
