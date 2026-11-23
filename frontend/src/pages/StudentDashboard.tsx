import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import StudentScheduleGrid from "../components/StudentScheduleGrid";
import { studentLinks } from "../constants/navLinks";
import { useLessons } from "../hooks/useLessons";
import { dayFullNames, formatShortDateString, formatTimeOfDay } from "../utils/time";

/* Next upcoming scheduled lesson, or null */
function pickNextLesson<T extends { date: string; startTime: string; endTime: string; status: string }>(lessons: T[]): T | null {
  const now = Date.now();
  const upcoming = lessons
    .filter((lesson) => lesson.status === "SCHEDULED")
    .map((lesson) => ({ lesson, start: new Date(`${lesson.date}T${lesson.startTime}`).getTime() }))
    .filter(({ start }) => start >= now)
    .sort((a, b) => a.start - b.start);
  return upcoming.length > 0 ? upcoming[0].lesson : null;
}

/* Student's home page: the next lesson at a glance and the interactive booking
   calendar. Lessons/Payments/Materials are already one click away in the navbar. */
function StudentDashboard() {
  const { lessons } = useLessons("STUDENT");
  const next = pickNextLesson(lessons);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/student" links={studentLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ברוכים השבים 👋</h1>
          <p className="text-slate-500 mt-1">לחצו על אחת המשבצות הירוקות בלוח כדי לקבוע שיעור חדש.</p>
        </div>

        {next && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-xs font-medium text-indigo-600">השיעור הבא שלך</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {next.subjectName} · {dayFullNames[new Date(`${next.date}T00:00:00`).getDay()]}, {formatShortDateString(next.date)}
              </p>
              <p className="text-sm text-slate-500">
                בשעה <span dir="ltr">{formatTimeOfDay(next.startTime)}&ndash;{formatTimeOfDay(next.endTime)}</span>
              </p>
            </div>
            <Link
              to="/student/lessons"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              כל השיעורים
            </Link>
          </div>
        )}

        <div className="mt-6">
          <StudentScheduleGrid />
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
