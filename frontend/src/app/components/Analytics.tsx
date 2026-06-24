import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Download, TrendingUp, Phone, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function Analytics() {
  const [selectedDate, setSelectedDate] = useState("");

  const [analytics, setAnalytics] = useState<any>({
    totalCalls: 0,
    successRate: 0,
    averageDuration: 0,
    flaggedStudents: 0,
    callTrends: [],
    commonExcuses: []
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // ✅ FETCH DATA
  const fetchAnalytics = async () => {
    try {
      const [summary, trends, excuses] = await Promise.all([
        fetch("https://automated-caller-bot-1.onrender.com/admin/summary").then(res => res.json()),
        fetch("https://automated-caller-bot-1.onrender.com/admin/weekly-trend").then(res => res.json()),
        fetch("https://automated-caller-bot-1.onrender.com/admin/top-excuses").then(res => res.json())
      ]);

      setAnalytics({
        totalCalls: summary.total_calls || 0,

        successRate: summary.total_calls
          ? Math.round((summary.total_recorded / summary.total_calls) * 100)
          : 0,

        averageDuration: summary.avg_duration || 30,

        // ✅ FIXED FLAGGED COUNT (handles all cases)
        flaggedStudents:
          summary.high_risk_cases ||
          summary.flagged_students ||
          summary.total_flagged ||
          0,

        callTrends: trends.weekly_trend?.map((t: any) => ({
          date: t.date,
          calls: t.count
        })) || [],

        commonExcuses: Object.entries(excuses || {}).map(([k, v]) => ({
          excuse: k,
          count: v
        }))
      });

    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics");
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ✅ CSV DOWNLOAD
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  // ✅ EXPORT HANDLER
  const handleExportReport = async (type: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      if (type === "Today's Report") {
        window.open(
          `https://automated-caller-bot-1.onrender.com/admin/daily-report?report_date=${today}`,
          "_blank"
        );
        return;
      }

      if (type === "Selected Date Report") {
        if (!selectedDate) {
          toast.error("Select a date first");
          return;
        }

        window.open(
          `https://automated-caller-bot-1.onrender.com/admin/daily-report?report_date=${selectedDate}`,
          "_blank"
        );
        return;
      }

      if (type === "Flagged Students") {
        const res = await fetch("https://automated-caller-bot-1.onrender.com/admin/flagged-students");
        const data = await res.json();

        const students = data.students || data;

        const csv = students
          .map((s: any) =>
            `${s.student_id},${s.category || ""},${s.risk_level || ""}`
          )
          .join("\n");

        downloadCSV(
          "flagged_students.csv",
          "student_id,category,risk\n" + csv
        );
        return;
      }

      if (type === "Common Excuses") {
        const res = await fetch("https://automated-caller-bot-1.onrender.com/admin/top-excuses");
        const data = await res.json();

        const csv = Object.entries(data)
          .map(([k, v]) => `${k},${v}`)
          .join("\n");

        downloadCSV("excuses.csv", "excuse,count\n" + csv);
        return;
      }

      if (type === "Call Success Rate") {
        const res = await fetch("https://automated-caller-bot-1.onrender.com/admin/summary");
        const data = await res.json();

        const csv = `total_calls,recorded_calls\n${data.total_calls},${data.total_recorded}`;
        downloadCSV("success_rate.csv", csv);
        return;
      }

      if (type === "Attendance Trends") {
        const res = await fetch("https://automated-caller-bot-1.onrender.com/admin/weekly-trend");
        const data = await res.json();

        const csv = data.weekly_trend
          .map((d: any) => `${d.date},${d.count}`)
          .join("\n");

        downloadCSV("attendance_trends.csv", "date,count\n" + csv);
        return;
      }

    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold mb-6">Analytics & Reports</h1>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-600 text-white p-6 rounded-xl">
          <Phone />
          <p className="text-2xl font-bold">{analytics.totalCalls}</p>
          <p>Total Calls</p>
        </div>

        <div className="bg-green-600 text-white p-6 rounded-xl">
          <CheckCircle />
          <p className="text-2xl font-bold">{analytics.successRate}%</p>
          <p>Success Rate</p>
        </div>

        <div className="bg-purple-600 text-white p-6 rounded-xl">
          <Clock />
          <p className="text-2xl font-bold">{analytics.averageDuration}s</p>
          <p>Avg Duration</p>
        </div>

        <div className="bg-orange-600 text-white p-6 rounded-xl">
          <TrendingUp />
          <p className="text-2xl font-bold">{analytics.flaggedStudents}</p>
          <p>Flagged Students</p>
        </div>
      </div>

      {/* 📈 LINE CHART */}
      <div className="bg-white p-6 rounded-xl mb-6">
        <h2 className="mb-4 font-semibold">Call Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.callTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="calls" stroke="#3B82F6" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 📊 BAR CHART */}
      <div className="bg-white p-6 rounded-xl mb-6">
        <h2 className="mb-4 font-semibold">Weekly Call Volume</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.callTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="calls" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🥧 PIE CHART */}
      <div className="bg-white p-6 rounded-xl mb-6">
        <h2 className="mb-4 font-semibold">Excuse Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={analytics.commonExcuses} dataKey="count" nameKey="excuse">
              {analytics.commonExcuses.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* DOWNLOADABLE REPORTS */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-6">Downloadable Reports</h2>

        {/* DATE PICKER */}
        <div className="flex gap-3 mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-2 rounded"
          />

          <button
            onClick={() => handleExportReport("Selected Date Report")}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Download
          </button>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            "Call Success Rate",
            "Common Excuses",
            "Attendance Trends",
            "Flagged Students",
            "Today's Report"
          ].map((title) => (
            <div
              key={title}
              onClick={() => handleExportReport(title)}
              className="cursor-pointer p-6 rounded-xl border-2 hover:border-blue-500 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 mb-2">
                <Download />
                <h3 className="font-semibold">{title}</h3>
              </div>
              <p className="text-sm text-gray-500">Download report</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}