import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from '@/app/components/Sidebar';
import { Dashboard } from '@/app/components/Dashboard';
import { StudentManagement } from '@/app/components/StudentManagement';
import { CallLogs } from '@/app/components/CallLogs';
import { FlaggedStudents } from '@/app/components/FlaggedStudents';
import { BulkCalls } from '@/app/components/BulkCalls';
import { Analytics as AnalyticsComponent } from '@/app/components/Analytics';
import {
  mockStudents,
  mockCallLogs,
  mockFlaggedStudents,
  mockBulkCalls
} from '@/app/data/mockData';
import { Student, CallLog, BulkCall, Analytics } from '@/app/types';

const API_BASE = "https://automated-caller-bot-1.onrender.com";

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [callLogs, setCallLogs] = useState<CallLog[]>(mockCallLogs);
  const [bulkCalls, setBulkCalls] = useState<BulkCall[]>(mockBulkCalls);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [errorAnalytics, setErrorAnalytics] = useState<string | null>(null);

  // 🔥 Fetch analytics from backend
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        const res = await fetch(`${API_BASE}/admin/summary`);
        if (!res.ok) throw new Error("Failed to fetch analytics");

        const data = await res.json();

        const transformed: Analytics = {
          totalCalls: data.total_calls || 0,
          successRate: data.total_calls
            ? Math.round((data.total_recorded / data.total_calls) * 100)
            : 0,
          averageDuration: 0,
          totalStudents: 0,
          absentToday: data.today_calls || 0,
          flaggedStudents: data.high_risk_cases || 0,
          commonExcuses: Object.entries(data.category_breakdown || {}).map(
            ([excuse, count]) => ({
              excuse,
              count: Number(count),
            })
          ),
          callTrends: [],
          departmentStats: []
        };

        setAnalytics(transformed);
      } catch (error: any) {
        console.error("Analytics fetch error:", error);
        setErrorAnalytics(error.message);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          loadingAnalytics ? (
            <div className="p-8 text-gray-600">Loading dashboard...</div>
          ) : errorAnalytics ? (
            <div className="p-8 text-red-500">{errorAnalytics}</div>
          ) : analytics ? (
            <Dashboard analytics={analytics} />
          ) : null
        )}

        {activeTab === 'students' && (
          <StudentManagement
            students={students}
            onToggleAbsence={(studentId) =>
              setStudents(prev =>
                prev.map(student =>
                  student.id === studentId
                    ? { ...student, isAbsent: !student.isAbsent }
                    : student
                )
              )
            }
            onInitiateCall={(studentId) => {
              const student = students.find(s => s.id === studentId);
              if (!student) return;

              const newCallLog: CallLog = {
                id: `call-${Date.now()}`,
                studentId: student.id,
                studentName: student.name,
                parentName: student.parentName,
                parentPhone: student.parentPhone,
                callDate: new Date().toISOString().split('T')[0],
                callTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                status: 'completed',
                duration: 45,
                reason: 'Processing...',
                transcript: '',
                audioUrl: '',
                excuseCategory: 'Processing'
              };

              setCallLogs(prev => [newCallLog, ...prev]);
            }}
          />
        )}

        {activeTab === 'call-logs' && <CallLogs />}
        {activeTab === 'flagged' && <FlaggedStudents flaggedStudents={mockFlaggedStudents} />}
        {activeTab === 'bulk-calls' && (
          <BulkCalls
            bulkCalls={bulkCalls}
            onCreateCampaign={(campaign) =>
              setBulkCalls(prev => [
                { ...campaign, id: `bulk-${Date.now()}` },
                ...prev
              ])
            }
          />
        )}
        {activeTab === 'analytics' && analytics && (
          <AnalyticsComponent analytics={analytics} />
        )}
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}