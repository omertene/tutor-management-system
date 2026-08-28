import { useState } from "react";
import NavBar from "../components/NavBar";
import AddStudentModal from "../components/AddStudentModal";
import AddLessonModal from "../components/dashboard/AddLessonModal";
import UpcomingLessonsPanel from "../components/dashboard/UpcomingLessonsPanel";
import OutstandingDebtPanel from "../components/dashboard/OutstandingDebtPanel";
import NeedsCompletionPanel from "../components/dashboard/NeedsCompletionPanel";
import { useDashboard } from "../hooks/useDashboard";
import { teacherLinks } from "../constants/navLinks";

/* minutes -> "1.5" / "2". Separate from utils/time's formatHours, which takes
   hours, since the "lessons this week" card sums durations in minutes */
function formatHoursFromMinutes(totalMinutes: number): string {
    const hours = totalMinutes / 60;
    return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

/* The teacher's home page: quick actions, stat cards, and the three dashboard panels */
function TeacherDashboard() {
    const {
        students, errorMessage,
        todaysLessons, tomorrowsLessons, needsCompletionLessons, debts,
        studentsThisMonthCount, lessonsThisWeekCount, minutesThisWeek, revenueThisMonth,
        refresh, completeLesson, cancelLesson,
    } = useDashboard();

    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [showAddLessonModal, setShowAddLessonModal] = useState(false);

    const actionButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors";
    const statCardClass = "bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Teacher Dashboard</h1>
                <p className="text-slate-500 mt-1">Here's an overview of your students.</p>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={() => setShowAddStudentModal(true)} className={actionButtonClass}>
                        + Add student
                    </button>
                    <button onClick={() => setShowAddLessonModal(true)} className={actionButtonClass}>
                        + Add lesson
                    </button>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={statCardClass}>
                        <p className="text-sm text-slate-500">Revenue this month</p>
                        <p className="text-2xl font-semibold text-slate-900 mt-1">₪{revenueThisMonth}</p>
                    </div>
                    <div className={statCardClass}>
                        <p className="text-sm text-slate-500">Lessons this week</p>
                        <p className="text-2xl font-semibold text-slate-900 mt-1">
                            {lessonsThisWeekCount} <span className="text-base font-normal text-slate-400">&middot; {formatHoursFromMinutes(minutesThisWeek)} hrs</span>
                        </p>
                    </div>
                    <div className={statCardClass}>
                        <p className="text-sm text-slate-500">Students this month</p>
                        <p className="text-2xl font-semibold text-slate-900 mt-1">{studentsThisMonthCount}</p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <UpcomingLessonsPanel todaysLessons={todaysLessons} tomorrowsLessons={tomorrowsLessons} />

                    <div className="lg:order-1 flex flex-col gap-6">
                        <OutstandingDebtPanel debts={debts} />
                        <NeedsCompletionPanel
                            lessons={needsCompletionLessons}
                            onComplete={completeLesson}
                            onCancel={cancelLesson}
                        />
                    </div>
                </div>
            </main>

            {showAddStudentModal && (
                <AddStudentModal onClose={() => setShowAddStudentModal(false)} onCreated={refresh} />
            )}

            {showAddLessonModal && (
                <AddLessonModal
                    students={students}
                    onClose={() => setShowAddLessonModal(false)}
                    onCreated={refresh}
                />
            )}
        </div>
    );
}

export default TeacherDashboard;
