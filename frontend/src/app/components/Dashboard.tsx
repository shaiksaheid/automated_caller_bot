import { useState, useEffect } from "react";
import {
  Users,
  Phone,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  MessageCircle,
  X
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = "https://automated-caller-bot-1.onrender.com";

export function Dashboard() {

  const [selectedDate, setSelectedDate] = useState("");
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [loadingAbsent, setLoadingAbsent] = useState(false);
  const [calling, setCalling] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  const [totalStudents, setTotalStudents] = useState(0);
  const [todayAbsentCount, setTodayAbsentCount] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [successRate, setSuccessRate] = useState(0);

  const [studentForm, setStudentForm] = useState({
    roll_no: "",
    name: "",
    parent_name: "",
    parent_phone: "",
    department: "",
    year: "",
    section: ""
  });

  // 🤖 CHATBOT
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatResult, setChatResult] = useState<any>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // ---------------- FETCH DASHBOARD ----------------
  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const studentsRes = await fetch(`${API_BASE}/students/`);
      const studentsData = await studentsRes.json();
      setTotalStudents(studentsData.length);

      const absentRes = await fetch(
        `${API_BASE}/admin/absent-students?date=${today}`
      );
      if (absentRes.ok) {
        const absentData = await absentRes.json();
        setTodayAbsentCount(absentData.length);
      }

      const summaryRes = await fetch(`${API_BASE}/admin/summary`);
      if (summaryRes.ok) {
        const summary = await summaryRes.json();

        setTotalCalls(summary.total_calls || 0);

        const rate = summary.total_calls
          ? Math.round((summary.total_recorded / summary.total_calls) * 100)
          : 0;

        setSuccessRate(rate);
      }

    } catch {
      toast.error("Dashboard load failed");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ---------------- ADD STUDENT ----------------
  const addStudent = async () => {
    if (!studentForm.roll_no || !studentForm.name || !studentForm.parent_phone) {
      toast.error("Required fields missing");
      return;
    }

    try {
      setAddingStudent(true);

      const res = await fetch(`${API_BASE}/students/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm)
      });

      if (!res.ok) throw new Error();

      toast.success("Student added");

      setStudentForm({
        roll_no: "",
        name: "",
        parent_name: "",
        parent_phone: "",
        department: "",
        year: "",
        section: ""
      });

      await fetchDashboardData();

    } catch {
      toast.error("Add failed");
    } finally {
      setAddingStudent(false);
    }
  };

  // ---------------- FETCH ABSENTEES ----------------
  const fetchAbsentStudents = async () => {
    if (!selectedDate) {
      toast.error("Select date first");
      return;
    }

    try {
      setLoadingAbsent(true);

      const res = await fetch(
        `${API_BASE}/admin/absent-students?date=${selectedDate}`
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setAbsentStudents(data);

    } catch {
      toast.error("Fetch failed");
    } finally {
      setLoadingAbsent(false);
    }
  };

  // ---------------- CALL ----------------
  const callAbsentStudents = async () => {
    if (!selectedDate) {
      toast.error("Select date first");
      return;
    }

    try {
      setCalling(true);

      const res = await fetch(
        `${API_BASE}/admin/call-absent?date=${selectedDate}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error();

      toast.success("Calling all");

    } catch {
      toast.error("Call failed");
    } finally {
      setCalling(false);
    }
  };

  // ---------------- CHATBOT ----------------
  const handleSearchStudent = async () => {
    try {
      if (!chatQuery) {
        toast.error("Enter roll number");
        return;
      }

      setChatLoading(true);

      const today = new Date().toISOString().split("T")[0];

      const [studentsRes, absentRes, riskRes, callRes] = await Promise.all([
        fetch(`${API_BASE}/students/`),
        fetch(`${API_BASE}/admin/absent-students?date=${today}`),
        fetch(`${API_BASE}/admin/flagged-students`),
        fetch(`${API_BASE}/admin/call-logs`)
      ]);

      const students = await studentsRes.json();
      const absents = await absentRes.json();
      const risks = await riskRes.json();
      const calls = await callRes.json();

      const student = students.find(
        (s: any) => s.roll_no.toLowerCase() === chatQuery.toLowerCase()
      );

      if (!student) {
        toast.error("Student not found");
        return;
      }

      setChatResult({
        name: student.name,
        department: student.department,
        phone: student.parent_phone,
        absents: absents.filter((a: any) => a.student_id === student.id).length,
        risk: risks.students?.find((r: any) => r.student_id === student.id)?.risk_level || "LOW",
        calls: calls.filter((c: any) => c.student_id === student.id).length
      });

    } catch {
      toast.error("Search failed");
    } finally {
      setChatLoading(false);
    }
  };

  // ---------------- UI ----------------
  const stats = [
    { label: "Total Students", value: totalStudents, icon: Users, color: "bg-blue-500" },
    { label: "Absent Today", value: todayAbsentCount, icon: AlertTriangle, color: "bg-orange-500" },
    { label: "Total Calls", value: totalCalls, icon: Phone, color: "bg-green-500" },
    { label: "Success Rate", value: `${successRate}%`, icon: CheckCircle, color: "bg-purple-500" }
  ];

  return (
    <div className="p-8">

      <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Overview</p>

      {/* ADD STUDENT */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <h2 className="font-semibold mb-4 flex gap-2 items-center">
          <UserPlus /> Add Student
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {Object.keys(studentForm).map((key) => (
            <input
              key={key}
              placeholder={key}
              value={(studentForm as any)[key]}
              onChange={(e) =>
                setStudentForm({ ...studentForm, [key]: e.target.value })
              }
              className="border px-3 py-2 rounded-lg"
            />
          ))}
        </div>

        <button
          onClick={addStudent}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          {addingStudent ? "Adding..." : "Add Student"}
        </button>
      </div>

      {/* CALL ABSENTEES */}
      <div className="bg-white rounded-xl border p-6 mb-8">

        <div className="flex gap-4 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          />

          <button
            onClick={fetchAbsentStudents}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            {loadingAbsent ? "Loading..." : "Fetch"}
          </button>

          <button
            onClick={callAbsentStudents}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            {calling ? "Calling..." : "Call All"}
          </button>
        </div>

        {absentStudents.length > 0 && (
          <div className="mt-4">
            {absentStudents.map((s, i) => (
              <div key={i} className="flex justify-between border-b py-2">
                <span>{s.roll_no} - {s.name}</span>
                <span>{s.parent_phone}</span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white border p-6 rounded-xl">
              <div className={`${stat.color} w-12 h-12 flex items-center justify-center rounded mb-4`}>
                <Icon className="text-white"/>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-gray-600 text-sm">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* 🤖 CHATBOT */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg"
      >
        {chatOpen ? <X /> : <MessageCircle />}
      </button>

      {chatOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-white rounded-xl shadow-xl border p-4">

          <input
            placeholder="Enter roll number"
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            className="border p-2 w-full mb-2 rounded"
          />

          <button
            onClick={handleSearchStudent}
            className="bg-blue-600 text-white w-full py-2 rounded"
          >
            {chatLoading ? "Searching..." : "Search"}
          </button>

          {chatResult && (
            <div className="mt-3 text-sm bg-gray-50 p-3 rounded">
              <p><b>{chatResult.name}</b></p>
              <p>{chatResult.department}</p>
              <p>{chatResult.phone}</p>
              <p>Absents: {chatResult.absents}</p>
              <p>Risk: {chatResult.risk}</p>
              <p>Calls: {chatResult.calls}</p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}