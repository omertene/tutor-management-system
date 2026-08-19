import NavBar from "../components/NavBar";
import StudentScheduleGrid from "../components/StudentScheduleGrid";

const studentLinks = [
  { label: "Lessons", to: "/student/lessons" },
  { label: "Payments", to: "/student/payments" },
  { label: "Materials", to: "/student/materials" },
];

// Lessons/Payments/Materials are already one click away in the navbar above, so
// this page doesn't repeat them as buttons - it's just the welcome text and the
// interactive booking calendar
function StudentDashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/student" links={studentLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 mt-1">Here's your schedule.</p>
        </div>

        <div className="mt-6">
          <StudentScheduleGrid />
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
