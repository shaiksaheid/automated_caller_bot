import { useState, useEffect } from "react";
import { Search, Phone, UserCheck, UserX, Filter } from "lucide-react";
import { toast } from "sonner";

const API_BASE = "https://automated-caller-bot-1.onrender.com";

export function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const today = new Date().toISOString().split("T")[0];

  // --------------------------------
  // LOAD DATA
  // --------------------------------
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 🔹 Fetch students
      const studentsRes = await fetch(`${API_BASE}/students/`);
      const studentsData = await studentsRes.json();

      // 🔹 Fetch attendance (FIXED)
      let attendanceMap = new Map();

      try {
        const attendanceRes = await fetch(
          `${API_BASE}/attendance/all?attendance_date=${today}`
        );

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();

          attendanceMap = new Map(
            attendanceData.map((a: any) => [a.student_id, a.status])
          );
        }
      } catch {
        console.warn("Attendance API not found");
      }

      // 🔹 Merge
      const mapped = studentsData.map((s: any) => {
        const status = attendanceMap.get(s.id);

        return {
          id: s.id,
          name: s.name,
          rollNumber: s.roll_no,
          department: s.department,
          class: `${s.year}-${s.section}`,
          parentName: s.parent_name,
          parentPhone: s.parent_phone,

          isAbsent: status === "ABSENT"
        };
      });

      setStudents(mapped);

    } catch {
      toast.error("Failed to load students");
    }
  };

  // --------------------------------
  // FILTERS
  // --------------------------------
  const departments = [
    "all",
    ...Array.from(new Set(students.map((s) => s.department)))
  ];

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parentPhone.includes(searchQuery);

    const matchesDepartment =
      departmentFilter === "all" ||
      student.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  // --------------------------------
  // MARK ATTENDANCE (FIXED)
  // --------------------------------
  const toggleAbsence = async (student: any) => {
    const newStatus = student.isAbsent ? "PRESENT" : "ABSENT";

    try {
      const res = await fetch(
        `${API_BASE}/attendance/mark?student_id=${student.id}&status=${newStatus}&attendance_date=${today}`,
        {
          method: "POST"
        }
      );

      if (!res.ok) throw new Error();

      toast.success(`${student.name} marked ${newStatus.toLowerCase()}`);

      // ✅ reload from backend (IMPORTANT)
      await loadData();

    } catch (err) {
      console.error(err);
      toast.error("Failed to update attendance");
    }
  };

  // --------------------------------
  // CALL PARENT (FIXED)
  // --------------------------------
  const initiateCall = async (student: any) => {
    if (!student.isAbsent) {
      toast.error("Student must be absent to call");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/calls/call-student?student_id=${student.id}`,
        {
          method: "POST"
        }
      );

      if (!res.ok) throw new Error();

      toast.success(`Calling parent of ${student.name}`);

    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate call");
    }
  };

  return (
    <div className="p-8">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">
          Student Management
        </h1>
        <p className="text-gray-600">
          Mark attendance and call parents
        </p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

            <input
              type="text"
              placeholder="Search name, roll, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border rounded-lg bg-white"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "all" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-blue-50 border p-4 rounded-lg">
          <p className="text-sm text-blue-600">Total Students</p>
          <p className="text-2xl font-bold">{students.length}</p>
        </div>

        <div className="bg-green-50 border p-4 rounded-lg">
          <p className="text-sm text-green-600">Present</p>
          <p className="text-2xl font-bold">
            {students.filter((s) => !s.isAbsent).length}
          </p>
        </div>

        <div className="bg-orange-50 border p-4 rounded-lg">
          <p className="text-sm text-orange-600">Absent</p>
          <p className="text-2xl font-bold">
            {students.filter((s) => s.isAbsent).length}
          </p>
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs uppercase">Class</th>
              <th className="px-6 py-3 text-left text-xs uppercase">Parent</th>
              <th className="px-6 py-3 text-left text-xs uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs uppercase">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">

                <td className="px-6 py-4">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-gray-500">
                    {student.rollNumber}
                  </div>
                </td>

                <td className="px-6 py-4">
                  {student.class}
                  <div className="text-sm text-gray-500">
                    {student.department}
                  </div>
                </td>

                <td className="px-6 py-4">
                  {student.parentName}
                  <div className="text-sm text-gray-500">
                    {student.parentPhone}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      student.isAbsent
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {student.isAbsent ? "Absent" : "Present"}
                  </span>
                </td>

                <td className="px-6 py-4 flex gap-2">

                  <button
                    onClick={() => toggleAbsence(student)}
                    className={`p-2 rounded ${
                      student.isAbsent
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {student.isAbsent ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <UserX className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => initiateCall(student)}
                    disabled={!student.isAbsent}
                    className={`p-2 rounded ${
                      student.isAbsent
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>

    </div>
  );
}