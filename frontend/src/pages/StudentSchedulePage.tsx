import NavBar from "../components/NavBar";
import StudentScheduleGrid from "../components/StudentScheduleGrid";

const studentLinks = [
    { label: "Schedule", to: "/student/schedule" },
    { label: "Lessons", to: "/student/lessons" },
    { label: "Payments", to: "/student/payments" },
    { label: "Materials", to: "/student/materials" },
];

function StudentSchedulePage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/student" links={studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
                <div className="mt-1">
                    <StudentScheduleGrid />
                </div>
            </main>
        </div>
    );
}

export default StudentSchedulePage;
