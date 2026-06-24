import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Play,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_BASE = "https://automated-caller-bot-1.onrender.com";

interface CallLog {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  callDate: string;
  callTime: string;
  status: string;
  duration: number;
  transcript: string;
  audioUrl: string;
  excuseCategory: string;
}

export function CallLogs() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [recordingOnly, setRecordingOnly] = useState(false);

  // ---------------- FETCH ----------------
  useEffect(() => {
    const fetchCallLogs = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/call-logs`);
        const data = await res.json();

        const transformed = data.map((log: any) => ({
          id: String(log.id),
          studentId: String(log.student_id),
          studentName: log.student_name || "Unknown",
          parentName: log.parent_name || "Unknown",
          parentPhone: log.parent_phone || "Unknown",
          callDate: log.call_date || "",
          callTime: log.call_time || "",
          status: (log.status || "completed").toLowerCase(),
          duration: log.duration || 0,
          transcript: log.transcript || "",
          audioUrl: log.audio_url || "",
          excuseCategory: log.excuse_category || "Uncategorized",
        }));

        setCallLogs(transformed);
      } catch {
        toast.error("Failed to load call logs");
      } finally {
        setLoading(false);
      }
    };

    fetchCallLogs();
  }, []);

  // ---------------- FILTER ----------------
  const filteredLogs = callLogs.filter((log) => {
    const search = searchQuery.toLowerCase();

    return (
      (log.studentName.toLowerCase().includes(search) ||
        log.parentName.toLowerCase().includes(search) ||
        log.parentPhone.includes(search)) &&
      (statusFilter === "all" || log.status === statusFilter)
    );
  });

  // ---------------- EXPORT PDF ----------------
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF();

    doc.text("Call Logs Report", 14, 10);
    doc.text(`Search: ${searchQuery || "All"}`, 14, 16);
    doc.text(`Status: ${statusFilter}`, 14, 22);

    const rows = filteredLogs.map((log) => [
      log.studentName,
      log.parentName,
      log.parentPhone,
      log.callDate,
      log.callTime,
      log.status,
      `${log.duration}s`,
      log.excuseCategory,
    ]);

    autoTable(doc, {
      startY: 28,
      head: [[
        "Student",
        "Parent",
        "Phone",
        "Date",
        "Time",
        "Status",
        "Duration",
        "Category",
      ]],
      body: rows,
      styles: { fontSize: 8 },
    });

    doc.save("filtered_call_logs.pdf");
  };

  // ---------------- STATUS COLOR ----------------
  const getStatusColor = (status: string) => {
    if (status === "completed") return "bg-green-100 text-green-800";
    if (status === "failed") return "bg-red-100 text-red-800";
    if (status === "no-answer") return "bg-yellow-100 text-yellow-800";
    if (status === "busy") return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  // ---------------- UI ----------------
  if (loading) {
    return <div className="p-8 text-gray-600">Loading call logs...</div>;
  }

  return (
    <div className="p-8">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Call Logs</h1>
        <p className="text-gray-600">All automated call records</p>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-xl border p-6 mb-6 flex gap-4">

        <div className="relative flex-1">
          <Search className="absolute left-3 top-2 text-gray-400 w-5 h-5" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 py-2 border rounded-lg"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="no-answer">No Answer</option>
          <option value="busy">Busy</option>
        </select>

        <button
          onClick={handleExportPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex gap-2 items-center hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">

          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Call</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-t hover:bg-gray-50">

                <td className="p-4">
                  <div className="font-medium">{log.studentName}</div>
                  <div className="text-sm text-gray-500">{log.parentName}</div>
                  <div className="text-sm text-gray-500">{log.parentPhone}</div>
                </td>

                <td className="p-4 text-sm">
                  <div className="flex gap-2 items-center">
                    <Calendar className="w-4 h-4" />
                    {log.callDate}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Clock className="w-4 h-4" />
                    {log.callTime}
                  </div>
                  <div>{log.duration}s</div>
                </td>

                <td className="p-4">
                  <span className={`px-2 py-1 rounded ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </td>

                <td className="p-4">
                  {log.excuseCategory}
                </td>

                <td className="p-4 flex gap-2">

                  <button
                    onClick={() => {
                      setRecordingOnly(true);
                      setSelectedCall(log);
                    }}
                    className="p-2 bg-blue-100 rounded hover:bg-blue-200"
                  >
                    <Play className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setRecordingOnly(false);
                      setSelectedCall(log);
                    }}
                    className="p-2 bg-green-100 rounded hover:bg-green-200"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* MODAL */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-xl">

            <h2 className="text-lg font-semibold mb-4">
              {recordingOnly ? "Recording" : "Details"}
            </h2>

            {!recordingOnly && (
              <div className="mb-4 space-y-2 text-sm">
                <p><b>Student:</b> {selectedCall.studentName}</p>
                <p><b>Parent:</b> {selectedCall.parentName}</p>
                <p><b>Phone:</b> {selectedCall.parentPhone}</p>
                <p><b>Status:</b> {selectedCall.status}</p>
                <p><b>Category:</b> {selectedCall.excuseCategory}</p>
              </div>
            )}

            <audio controls className="w-full mb-4">
              <source
                src={`${API_BASE}/admin/recording/${selectedCall.id}`}
                type="audio/mpeg"
              />
            </audio>

            {!recordingOnly && selectedCall.transcript && (
              <div className="bg-gray-100 p-3 rounded text-sm">
                {selectedCall.transcript}
              </div>
            )}

            <button
              onClick={() => setSelectedCall(null)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}