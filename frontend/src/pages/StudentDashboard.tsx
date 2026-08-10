import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";

const studentLinks = [
  { label: "Home", to: "/student" },
  { label: "Lessons", to: "/student/lessons" },
  { label: "Payments", to: "/student/payments" },
  { label: "Materials", to: "/student/materials" },
];

function StudentDashboard() {
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
      </main>
    </div>
  );
}

export default StudentDashboard;
