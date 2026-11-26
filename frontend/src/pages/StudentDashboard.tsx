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

const card = "rounded-[18px] border border-slate-200 bg-white shadow-sm";

/* "היום" / "מחר" / "בעוד יומיים" / "בעוד N ימים" for a lesson within the next week, otherwise
   nothing (the date itself is already shown) */
function relativeDayLabel(date: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lessonDay = new Date(`${date}T00:00:00`);
  const diff = Math.round((lessonDay.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "היום";
  if (diff === 1) return "מחר";
  if (diff === 2) return "בעוד יומיים";
  if (diff >= 3 && diff <= 7) return `בעוד ${diff} ימים`;
  return null;
}

/* Student's home page: greeting, the next lesson up front, balance, the interactive booking
   calendar and the latest materials. Lessons/Payments/Materials are also in the navbar. */
function StudentDashboard() {
  const { lessons } = useLessons("STUDENT");
  const next = pickNextLesson(lessons);
  const nextDayLabel = next ? relativeDayLabel(next.date) : null;
  const upcomingCount = lessons.filter((l) => l.status === "SCHEDULED" && new Date(`${l.date}T${l.startTime}`).getTime() >= Date.now()).length;

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
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/student" links={studentLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
        <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900">
          {firstName ? `היי ${firstName}!` : "ברוכים השבים!"}
        </h1>

        <section className="flex flex-wrap gap-6">
          <div className="flex-[1.8_1_560px] min-w-0 rounded-[22px] px-9 py-8 text-white bg-[linear-gradient(160deg,#18214f_0%,#1e2a66_55%,#27377d_100%)]">
            {next ? (
              <div className="flex flex-col gap-3.5">
                <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-[#fbbf24]">
                  <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                  השיעור הבא שלך
                  {nextDayLabel && (
                    <span className="ms-1.5 rounded-full bg-[#fbbf24] px-3.5 py-1 text-[15px] font-extrabold text-[#18214f]">
                      {nextDayLabel}
                    </span>
                  )}
                </span>
                <span className="text-[46px] font-extrabold leading-[1.05] tracking-tight">{next.subjectName}</span>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[19px] text-[#e0e7ff]">
                  <span>
                    {dayFullNames[new Date(`${next.date}T00:00:00`).getDay()]}, {formatShortDateString(next.date)}
                  </span>
                  <span dir="ltr">{formatTimeOfDay(next.startTime)}&ndash;{formatTimeOfDay(next.endTime)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <span className="flex items-center gap-2 text-[15px] font-bold text-[#fbbf24]">
                  <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                  השיעור הבא שלך
                </span>
                <span className="text-3xl font-extrabold tracking-tight">אין שיעורים עתידיים</span>
                <span className="text-[19px] text-[#e0e7ff]">בחרו משבצת ירוקה בלוח כדי לקבוע שיעור.</span>
              </div>
            )}
          </div>

          <div className="flex flex-[1_1_300px] min-w-0 flex-col gap-4">
            {debt && (
              <section className={`${card} flex flex-1 flex-col justify-center gap-1.5 px-6 py-5`}>
                <span className="text-sm font-semibold text-slate-500">יתרה לתשלום</span>
                {Number(debt.debt) > 0 ? (
                  <span className="text-[34px] font-extrabold tracking-tight text-amber-700">{formatMoney(debt.debt)}</span>
                ) : (
                  <span className="text-2xl font-extrabold text-emerald-600">הכל שולם ✓</span>
                )}
                <Link to="/student/payments" className="mt-1.5 text-[15px] font-bold text-[#27377d] hover:underline">
                  לתשלומים &larr;
                </Link>
              </section>
            )}
            <section className={`${card} px-6 py-5 text-center`}>
              <p className="text-[30px] font-extrabold text-slate-900">{upcomingCount}</p>
              <p className="text-sm text-slate-500">שיעורים קרובים</p>
            </section>
          </div>
        </section>

        <section className="flex flex-wrap items-start gap-6">
          <div className="flex-[2.2_1_620px] min-w-0">
            <h2 className="text-[22px] font-extrabold text-slate-900">קביעת שיעור</h2>
            <p className="mt-1 text-[15px] text-slate-600">לחצו על משבצת ירוקה, או גררו כדי לבחור משך שיעור.</p>
            <StudentScheduleGrid />
          </div>

          {latestMaterials.length > 0 && (
            <aside className={`${card} flex-[1_1_320px] min-w-0 px-[22px] pb-3 pt-[22px]`}>
              <h3 className="text-lg font-extrabold text-slate-900">חומרי לימוד אחרונים</h3>
              <ul className="mt-3">
                {latestMaterials.map((material) => (
                  <li key={material.id} className="flex items-center gap-3 border-t border-slate-100 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eef1f8] text-[#1e2a66]" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                        <path d="M14 3v5h5M9 13h6M9 17h6" />
                      </svg>
                    </span>
                    <span className="truncate text-[15px] font-semibold text-slate-900">{material.title}</span>
                  </li>
                ))}
              </ul>
              <Link to="/student/materials" className="mb-2 mt-1.5 inline-block text-[15px] font-bold text-[#27377d] hover:underline">
                לכל החומרים &larr;
              </Link>
            </aside>
          )}
        </section>
      </main>
    </div>
  );
}

export default StudentDashboard;
