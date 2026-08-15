import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import StudentScheduleGrid from "../components/StudentScheduleGrid";

const API_BASE_URL = "http://localhost:8080";

const studentLinks = [
  { label: "Lessons", to: "/student/lessons" },
  { label: "Payments", to: "/student/payments" },
  { label: "Materials", to: "/student/materials" },
];

type Debt = {
  totalOwed: number;
  totalPaid: number;
  debt: number;
};

function StudentDashboard() {
  const token = localStorage.getItem("token")!;

  const [debt, setDebt] = useState<Debt | null>(null);

  useEffect(() => {
    async function loadDebt() {
      const response = await fetch(`${API_BASE_URL}/student/debt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      setDebt(await response.json());
    }

    loadDebt();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/student" links={studentLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 mt-1">Here's your schedule.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
            <p className="text-sm text-slate-500">Balance</p>
            {debt && (
              <p className={`text-2xl font-semibold mt-1 ${debt.debt > 0 ? "text-red-600" : "text-green-600"}`}>
                ₪{debt.debt}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/student/lessons"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            View lessons
          </Link>
          <Link
            to="/student/materials"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            View materials
          </Link>
        </div>

        <div className="mt-6">
          <StudentScheduleGrid />
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
