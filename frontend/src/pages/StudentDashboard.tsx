import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";

const API_BASE_URL = "http://localhost:8080";

const studentLinks = [
  { label: "Lessons", to: "/student/lessons" },
  { label: "Payments", to: "/student/payments" },
  { label: "Materials", to: "/student/materials" },
];

type Lesson = {
  id: number;
  subjectName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

type Debt = {
  totalOwed: number;
  totalPaid: number;
  debt: number;
};

function StudentDashboard() {
  const token = localStorage.getItem("token")!;

  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [debt, setDebt] = useState<Debt | null>(null);

  useEffect(() => {
    async function loadUpcomingLessons() {
      const response = await fetch(`${API_BASE_URL}/student/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;

      const data: Lesson[] = await response.json();
      const nextLessons = data
        .filter((lesson) => lesson.status === "SCHEDULED")
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
        .slice(0, 3);
      setUpcomingLessons(nextLessons);
    }

    async function loadDebt() {
      const response = await fetch(`${API_BASE_URL}/student/debt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      setDebt(await response.json());
    }

    loadUpcomingLessons();
    loadDebt();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/student" links={studentLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="text-slate-500 mt-1">Here's what's coming up.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/student/lessons"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            View lessons
          </Link>
          <Link
            to="/student/payments"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            View balance
          </Link>
          <Link
            to="/student/materials"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            View materials
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming lessons</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingLessons.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500 text-center">No upcoming lessons.</p>
              )}
              {upcomingLessons.map((lesson) => (
                <div key={lesson.id} className="px-6 py-3 flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {lesson.date} {lesson.startTime}-{lesson.endTime}
                  </span>
                  <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-500">Balance</p>
            {debt && (
              <p className={`text-2xl font-semibold mt-1 ${debt.debt > 0 ? "text-red-600" : "text-green-600"}`}>
                ₪{debt.debt}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
