import { useEffect, useState } from "react";
import { Upload, PhoneCall, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Campaign {
  id: number;
  campaignName: string;
  message: string;
  totalCalls: number;
  completed: number;
  failed: number;
  status: string;
  createdAt: string;
}

export function BulkCalls() {
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // 📥 Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await fetch("https://automated-caller-bot-1.onrender.com/admin/bulk-campaigns");
      const data = await res.json();
      setCampaigns(data);
    } catch {
      console.error("Failed to fetch campaigns");
    }
  };

  // 🔄 Auto reload every 3 sec
  useEffect(() => {
    fetchCampaigns();

    const interval = setInterval(() => {
      fetchCampaigns();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 📂 File select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      toast.success(`Selected: ${selected.name}`);
    }
  };

  // 📥 Download sample Excel
  const downloadSampleExcel = () => {
    const data = [
      ["phone"],
      ["+918885999999"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Sample");

    XLSX.writeFile(wb, "sample_bulk_numbers.xlsx");
  };

  // 🚀 Submit
  const handleSubmit = async () => {
    if (!campaignName || !message || !file) {
      toast.error("All fields required");
      return;
    }

    const formData = new FormData();
    formData.append("campaign_name", campaignName);
    formData.append("message", message);
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await fetch("https://automated-caller-bot-1.onrender.com/admin/bulk-call", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success("Campaign started!");

      // 🔄 Refresh campaigns
      fetchCampaigns();

      // Reset form
      setCampaignName("");
      setMessage("");
      setFile(null);

    } catch {
      toast.error("Failed to start campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Bulk Calling System</h1>

      {/* FORM */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">

        <input
          type="text"
          placeholder="Campaign Name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <textarea
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        {/* FILE UPLOAD */}
        <label className="border-2 border-dashed p-4 rounded-lg flex flex-col items-center cursor-pointer hover:bg-gray-50">
          <Upload className="w-6 h-6 mb-2 text-gray-500" />
          <span className="text-sm">
            {file ? file.name : "Click to upload CSV/Excel"}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* BUTTONS */}
        <div className="flex gap-3 mt-4">

          {/* START CALL */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
          >
            <PhoneCall className="w-4 h-4" />
            {loading ? "Calling..." : "Start Bulk Calls"}
          </button>

          {/* DOWNLOAD SAMPLE */}
          <button
            onClick={downloadSampleExcel}
            className="bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-800"
          >
            <Download className="w-4 h-4" />
            Download Sample
          </button>

        </div>

      </div>

      {/* CAMPAIGNS */}
      <div className="space-y-4">
        {campaigns.map((c) => {
          const progress =
            c.totalCalls > 0
              ? Math.round((c.completed / c.totalCalls) * 100)
              : 0;

          return (
            <div
              key={c.id}
              className="border p-4 rounded-lg bg-white shadow"
            >
              <div className="flex justify-between">
                <h3 className="font-semibold">{c.campaignName}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    c.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {c.status.toUpperCase()}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-2">
                {c.createdAt}
              </p>

              <p className="text-sm mb-3">{c.message}</p>

              {/* PROGRESS */}
              <div className="w-full bg-gray-200 h-2 rounded mb-2">
                <div
                  className="bg-blue-600 h-2 rounded"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 text-sm">
                <p>Total: {c.totalCalls}</p>
                <p className="text-green-600">Done: {c.completed}</p>
                <p className="text-red-600">Failed: {c.failed}</p>
              </div>
            </div>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <p className="text-center text-gray-500 mt-6">
          No campaigns yet
        </p>
      )}

    </div>
  );
}