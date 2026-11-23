import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import StudentScheduleGrid from "../components/StudentScheduleGrid";
import { studentLinks } from "../constants/navLinks";
import { useLessons } from "../hooks/useLessons";
import { apiFetch } from "../utils/api";
import { formatMoney } from "../utils/money";
import { dayFullNames, formatShortDateString, formatTimeOfDay } from "../utils/time";
import type { Debt } from "../types/payment";
import type { Material } from "../types/material";

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

const sideCard = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

/* Student's home page: greeting, the interactive booking calendar, and a side
   column with the things a student checks most (next lesson, balance, materials).
   Lessons/Payments/Materials are also one click away in the navbar. */
function StudentDashboard() {
  const { lessons } = useLessons("STUDENT");
  const next = pickNextLesson(lessons);
  const upcomingCount = lessons.filter((l) => l.status === "SCHEDULED" && new Date(`${l.date}T${l.startTime}`).getTime() >= Date.now()).length;
  const completedCount = lessons.filter((l) => l.status === "COMPLETED").length;

  /* Side data loads independently; any card whose request fails just stays hidden */
  const [firstName, setFirstName] = useState("");
  const [debt, setDebt] = useState<Debt | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  useEffect(() => {
    async function load() {
      const [meRes, debtRes, materialsRes] = await Promise.all([
        apiFetch("/student/me"),
        apiFetch("/student/debt"),
        apiFetch("/student/materials"),
      ]);
      if (meRes.ok) setFirstName(((await meRes.json()) as { firstName: string }).firstName);
      if (debtRes.ok) setDebt((await debtRes.json()) as Debt);
      if (materialsRes.ok) setMaterials((await materialsRes.json()) as Material[]);
    }
    load();
  }, []);

  const latestMaterials = [...materials]
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <NavBar homePath="/student" links={studentLinks} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 px-6 py-4 text-white shadow-sm">
          <h1 className="text-xl font-semibold">{firstName ? `היי ${firstName} 👋` : "ברוכים השבים 👋"}</h1>
          <p className="mt-0.5 text-sm text-indigo-100">לחצו על משבצת ירוקה בלוח כדי לקבוע שיעור חדש.</p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div>
            <StudentScheduleGrid />
          </div>

          <aside className="order-first space-y-4 lg:order-none">
            <section className={sideCard}>
              <p className="text-xs font-medium text-indigo-600">השיעור הבא שלך</p>
              {next ? (
                <>
                  <p className="mt-1 text-base font-semibold text-slate-900">{next.subjectName}</p>
                  <p className="text-sm text-slate-600">
                    {dayFullNames[new Date(`${next.date}T00:00:00`).getDay()]}, {formatShortDateString(next.date)}
                  </p>
                  <p className="text-sm text-slate-500">
                    <span dir="ltr">{formatTimeOfDay(next.startTime)}&ndash;{formatTimeOfDay(next.endTime)}</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500">אין שיעורים עתידיים. בחרו משבצת ירוקה בלוח.</p>
              )}
              <Link to="/student/lessons" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
                כל השיעורים &larr;
              </Link>
            </section>

            <section className={`${sideCard} grid grid-cols-2 gap-3 text-center`}>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{upcomingCount}</p>
                <p className="text-xs text-slate-500">שיעורים קרובים</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{completedCount}</p>
                <p className="text-xs text-slate-500">שיעורים שהושלמו</p>
              </div>
            </section>

            {debt && (
              <section className={sideCard}>
                <p className="text-xs font-medium text-slate-500">יתרה לתשלום</p>
                {Number(debt.debt) > 0 ? (
                  <p className="mt-1 text-2xl font-semibold text-amber-600">{formatMoney(debt.debt)}</p>
                ) : (
                  <p className="mt-1 text-base font-semibold text-emerald-600">הכל שולם ✓</p>
                )}
                <Link to="/student/payments" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  לתשלומים &larr;
                </Link>
              </section>
            )}

            {latestMaterials.length > 0 && (
              <section className={sideCard}>
                <p className="text-xs font-medium text-slate-500">חומרי לימוד אחרונים</p>
                <ul className="mt-2 space-y-1.5">
                  {latestMaterials.map((material) => (
                    <li key={material.id} className="truncate text-sm text-slate-800">{material.title}</li>
                  ))}
                </ul>
                <Link to="/student/materials" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  לכל החומרים &larr;
                </Link>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
