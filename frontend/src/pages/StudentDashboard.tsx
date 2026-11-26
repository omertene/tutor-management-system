import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import StudentScheduleGrid from "../components/StudentScheduleGrid";
import { studentLinks } from "../constants/navLinks";
import { useLessons } from "../hooks/useLessons";
import { apiFetch } from "../utils/api";
import { formatMoney } from "../utils/money";
import { dayLabels, formatTimeOfDay } from "../utils/time";
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

/* "2026-11-27" -> "יום ו׳, 27 בנובמבר" */
function longLessonDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `יום ${dayLabels[d.getDay()]}, ${d.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}`;
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

  /* Side data loads independently; any card whose request fails just stays hidden */
  const [firstName, setFirstName] = useState("");
  const [debt, setDebt] = useState<Debt | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
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

  const latestMaterials = [...(materials ?? [])]
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/student" links={studentLinks} />

      <main className="mx-auto max-w-[1600px] px-6 pt-4 pb-3">
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">
          {firstName ? `היי ${firstName}!` : "ברוכים השבים!"}
        </h1>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* main column: next lesson strip + the booking calendar */}
          <div className="min-w-0 space-y-4">
            <section className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 rounded-[18px] bg-[linear-gradient(160deg,#18214f_0%,#1e2a66_55%,#27377d_100%)] px-7 py-4 text-white">
              {next ? (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#fbbf24]">
                      <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                      השיעור הבא שלך
                      {nextDayLabel && (
                        <span className="ms-1 rounded-full bg-[#fbbf24] px-3 py-0.5 text-sm font-extrabold text-[#18214f]">
                          {nextDayLabel}
                        </span>
                      )}
                    </span>
                    <span className="text-[32px] font-extrabold leading-tight tracking-tight">{next.subjectName}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[18px] text-[#e0e7ff]">
                      <span className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="16" rx="3" />
                          <path d="M3 10h18M8 3v4M16 3v4" />
                        </svg>
                        {longLessonDate(next.date)}
                      </span>
                      <span dir="ltr" className="flex items-center gap-2 font-semibold">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        {formatTimeOfDay(next.startTime)}&ndash;{formatTimeOfDay(next.endTime)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-sm font-bold text-[#fbbf24]">
                      <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                      השיעור הבא שלך
                    </span>
                    <span className="text-[28px] font-extrabold leading-tight tracking-tight">אין שיעורים עתידיים</span>
                  </div>
                  <span className="text-[17px] text-[#e0e7ff]">בחרו משבצת ירוקה בלוח כדי לקבוע שיעור.</span>
                </>
              )}
            </section>

            <StudentScheduleGrid />
          </div>

          {/* side column: balance, count, latest materials */}
          <aside className="space-y-4">
            {debt && (
              <section className={`${card} flex flex-col gap-1.5 px-6 py-5`}>
                <span className="text-sm font-semibold text-slate-500">יתרה לתשלום</span>
                {Number(debt.debt) > 0 ? (
                  <span className="text-[34px] font-extrabold tracking-tight text-amber-700">{formatMoney(debt.debt)}</span>
                ) : (
                  <>
                    <span className="text-[34px] font-extrabold tracking-tight text-emerald-600">{formatMoney(0)}</span>
                    <span className="text-sm font-semibold text-emerald-700">אין מה לשלם כרגע</span>
                  </>
                )}
                <Link to="/student/payments" className="mt-1 text-[15px] font-bold text-[#27377d] hover:underline">
                  היסטוריית תשלומים &larr;
                </Link>
              </section>
            )}

            {materials !== null && (
              <section className={`${card} px-[22px] pb-3 pt-5`}>
                <h3 className="text-lg font-extrabold text-slate-900">חומרי לימוד אחרונים</h3>
                {latestMaterials.length > 0 ? (
                  <>
                    <ul className="mt-2">
                      {latestMaterials.map((material) => (
                        <li key={material.id} className="flex items-center gap-3 border-t border-slate-100 py-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eef1f8] text-[#1e2a66]" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                              <path d="M14 3v5h5M9 13h6M9 17h6" />
                            </svg>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold text-slate-900">{material.title}</span>
                            <span className="block text-[13px] text-slate-500">
                              הועלה {new Date(material.uploadedAt).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/student/materials" className="mb-2 mt-1.5 inline-block text-[15px] font-bold text-[#27377d] hover:underline">
                      לכל החומרים &larr;
                    </Link>
                  </>
                ) : (
                  <p className="mb-2 mt-2 text-[15px] text-slate-500">עדיין לא הועלו חומרי לימוד.</p>
                )}
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
