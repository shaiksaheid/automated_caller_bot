import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Phone } from "lucide-react";
import { toast } from "sonner";

const API = "https://automated-caller-bot-1.onrender.com";

export function FlaggedStudents() {
  const [riskStats, setRiskStats] = useState<any>({});
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [highRisk, setHighRisk] = useState<any[]>([]);
  const [allRiskStudents, setAllRiskStudents] = useState<any[]>([]);
  const [studentMap, setStudentMap] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [
        studentsRes,
        riskRes,
        topRes,
        highRes,
        allRes
      ] = await Promise.all([
        fetch(`${API}/students/`),
        fetch(`${API}/admin/risk-percentage`),
        fetch(`${API}/admin/top-risk-students`),
        fetch(`${API}/admin/high-risk-students`),
        fetch(`${API}/admin/flagged-students`)
      ]);

      const studentsData = await studentsRes.json();
      const riskData = await riskRes.json();
      const topData = await topRes.json();
      const highData = await highRes.json();
      const allData = await allRes.json();

      // 🔥 CREATE MAP
      const map: any = {};
      studentsData.forEach((s: any) => {
        map[s.id] = s;
      });

      setStudentMap(map);
      setRiskStats(riskData);
      setTopStudents(topData.students || []);
      setHighRisk(highData.students || []);
      setAllRiskStudents(allData.students || allData);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async (student_id: number) => {
    try {
      await fetch(
        `${API}/calls/call-student?student_id=${student_id}`,
        { method: "POST" }
      );
      toast.success("Calling parent 📞");
    } catch {
      toast.error("Call failed");
    }
  };

  const getStudent = (id: number) => {
    return studentMap[id] || {};
  };

  const getColor = (risk: string) => {
    if (risk === "HIGH") return "bg-red-100 border-red-300";
    if (risk === "MEDIUM") return "bg-orange-100 border-orange-300";
    return "bg-yellow-100 border-yellow-300";
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">

      {/* HEADER */}
      <h1 className="text-3xl font-semibold mb-6 flex items-center gap-2">
        <AlertTriangle className="text-red-500" />
        Risk Analysis Dashboard
      </h1>

      {/* RISK CARDS */}
      <div className="grid grid-cols-3 gap-6 mb-8">

        <div className="bg-red-500 text-white p-6 rounded-xl">
          <p>High</p>
          <h2 className="text-3xl">{riskStats.HIGH || 0}</h2>
        </div>

        <div className="bg-orange-500 text-white p-6 rounded-xl">
          <p>Medium</p>
          <h2 className="text-3xl">{riskStats.MEDIUM || 0}</h2>
        </div>

        <div className="bg-yellow-500 text-white p-6 rounded-xl">
          <p>Low</p>
          <h2 className="text-3xl">{riskStats.LOW || 0}</h2>
        </div>

      </div>

      {/* HIGH RISK */}
      <h2 className="text-xl font-semibold mb-4 text-red-600">
        High Risk Students
      </h2>

      {highRisk.map((s: any, i) => {
        const student = getStudent(s.student_id);

        return (
          <div key={i} className="p-4 bg-red-50 border rounded-lg flex justify-between mb-2">

            <div>
              <p className="font-semibold">{student.name}</p>
              <p className="text-sm text-gray-600">{student.department}</p>
              <p className="text-sm">{student.parent_phone}</p>
            </div>

            <button
              onClick={() => handleCall(s.student_id)}
              className="bg-blue-600 text-white px-3 py-1 rounded flex gap-1 items-center"
            >
              <Phone className="w-4 h-4" />
              Call
            </button>

          </div>
        );
      })}

      {/* ALL RISK STUDENTS */}
      <h2 className="text-xl font-semibold mt-8 mb-4">
        All Risk Students
      </h2>

      {allRiskStudents.map((s: any, i) => {
        const student = getStudent(s.student_id);

        return (
          <div
            key={i}
            className={`p-4 border rounded-lg flex justify-between mb-2 ${getColor(
              s.risk_level
            )}`}
          >

            <div>
              <p className="font-semibold">{student.name}</p>
              <p className="text-sm text-gray-600">{student.department}</p>
              <p className="text-sm">{student.parent_phone}</p>
              <p className="text-xs">Risk: {s.risk_level}</p>
            </div>

            <button
              onClick={() => handleCall(s.student_id)}
              className="bg-blue-600 text-white px-3 py-1 rounded flex gap-1 items-center"
            >
              <Phone className="w-4 h-4" />
              Call
            </button>

          </div>
        );
      })}

    </div>
  );
}