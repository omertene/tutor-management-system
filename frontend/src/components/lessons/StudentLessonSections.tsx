import { useState } from "react";
import ListPager from "../ListPager";
import { usePagination } from "../../hooks/usePagination";
import { formatMoney } from "../../utils/money";
import { formatTimeOfDay } from "../../utils/time";
import { formatRelativeLessonDate, statusStyles, studentStatusLabels, STUDENT_MIN_CANCEL_NOTICE_HOURS } from "../../types/lesson";
import type { Lesson } from "../../types/lesson";

const LESSONS_PER_PAGE = 10;

/* What the student sees instead of the teacher's single filterable table:
   filter tabs (with live counts) over rows that read as small cards. */

type StudentLessonSectionsProps = {
    upcoming: Lesson[];
    completed: Lesson[];
    cancelled: Lesson[];
    today: string;
    canCancel: (lesson: Lesson) => boolean;
    onCancel: (lesson: Lesson) => void;
};

type Tab = "ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED";

const listClass = "bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden";
const emptyClass = "px-4 py-8 text-sm text-slate-500 text-center";
const badgeClass = "text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5";

/* A few soft tile colors, picked by the subject name so a subject always looks the same */
const tileColors = [
    "bg-indigo-50 text-indigo-600 border-indigo-100",
    "bg-amber-50 text-amber-700 border-amber-100",
    "bg-emerald-50 text-emerald-700 border-emerald-100",
    "bg-rose-50 text-rose-600 border-rose-100",
    "bg-sky-50 text-sky-700 border-sky-100",
];

function tileColorFor(name: string): string {
    let sum = 0;
    for (const char of name) sum += char.charCodeAt(0);
    return tileColors[sum % tileColors.length];
}

/* One lesson as a card-like row. `muted` is used for cancelled lessons. */
function LessonRow({ lesson, today, action, muted }: {
    lesson: Lesson;
    today: string;
    action?: React.ReactNode;
    muted?: boolean;
}) {
    return (
        <div className={`px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 ${muted ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-base font-bold ${tileColorFor(lesson.subjectName)}`}>
                    {lesson.subjectName.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-semibold text-slate-900">{lesson.subjectName}</p>
                    <p className="text-sm text-slate-500">
                        {formatRelativeLessonDate(lesson.date, today)}
                        <span className="mx-1.5 text-slate-300">&bull;</span>
                        <span dir="ltr" className="inline-block">
                            {formatTimeOfDay(lesson.startTime)}&ndash;{formatTimeOfDay(lesson.endTime)}
                        </span>
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">{formatMoney(lesson.priceAtBooking)}</span>
                <span className={`${badgeClass} ${statusStyles[lesson.status]}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {studentStatusLabels[lesson.status]}
                </span>
                {action}
            </div>
        </div>
    );
}

/* A titled, paginated list of lessons (pager hidden when everything fits on one page) */
function LessonGroup({ title, lessons, emptyText, today, renderAction, muted }: {
    title?: string;
    lessons: Lesson[];
    emptyText: string;
    today: string;
    renderAction?: (lesson: Lesson) => React.ReactNode;
    muted?: boolean;
}) {
    const { page, totalPages, visibleItems, setPage } = usePagination(lessons, LESSONS_PER_PAGE, String(lessons.length));

    return (
        <section>
            {title && (
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
                    {title}
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{lessons.length}</span>
                </h2>
            )}
            <div className={listClass}>
                {lessons.length === 0 && <p className={emptyClass}>{emptyText}</p>}
                {visibleItems.map((lesson) => (
                    <LessonRow key={lesson.id} lesson={lesson} today={today} muted={muted} action={renderAction?.(lesson)} />
                ))}
            </div>
            {lessons.length > LESSONS_PER_PAGE && (
                <ListPager page={page} totalPages={totalPages} totalItems={lessons.length} perPage={LESSONS_PER_PAGE} onChange={setPage} />
            )}
        </section>
    );
}

export default function StudentLessonSections({
    upcoming, completed, cancelled, today, canCancel, onCancel,
}: StudentLessonSectionsProps) {
    const [tab, setTab] = useState<Tab>("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");

    /* Every subject the student has a lesson in, for the subject filter */
    const subjectNames = Array.from(new Set([...upcoming, ...completed, ...cancelled].map((l) => l.subjectName))).sort();
    const bySubject = (lessons: Lesson[]) => subjectFilter === "ALL" ? lessons : lessons.filter((l) => l.subjectName === subjectFilter);

    const shownUpcoming = bySubject(upcoming);
    const shownCompleted = bySubject(completed);
    const shownCancelled = bySubject(cancelled);

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: "ALL", label: "פעילים והיסטוריה", count: shownUpcoming.length + shownCompleted.length },
        { key: "UPCOMING", label: "קרובים", count: shownUpcoming.length },
        { key: "COMPLETED", label: "הושלמו", count: shownCompleted.length },
        { key: "CANCELLED", label: "בוטלו", count: shownCancelled.length },
    ];

    function renderCancel(lesson: Lesson) {
        return (
            <button
                onClick={() => onCancel(lesson)}
                disabled={!canCancel(lesson)}
                title={canCancel(lesson) ? undefined : `לא ניתן לבטל פחות מ-${STUDENT_MIN_CANCEL_NOTICE_HOURS} שעות לפני תחילת השיעור.`}
                className="px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
                ביטול שיעור
            </button>
        );
    }

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex flex-wrap gap-2">
                    {tabs.map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                                tab === key
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            {label} ({count})
                        </button>
                    ))}
                </div>
                {subjectNames.length > 1 && (
                    <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
                    >
                        <option value="ALL">כל המקצועות</option>
                        {subjectNames.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                )}
            </div>

            <div className="mt-6 flex flex-col gap-8">
                {tab === "ALL" && (
                    <>
                        <LessonGroup title="שיעורים קרובים" lessons={shownUpcoming} today={today} renderAction={renderCancel}
                            emptyText="אין שיעורים קרובים. אפשר לקבוע שיעור בלוח הזמנים!" />
                        <LessonGroup title="שיעורים שהושלמו" lessons={shownCompleted} today={today}
                            emptyText="עדיין אין שיעורים שהושלמו." />
                    </>
                )}
                {tab === "UPCOMING" && (
                    <LessonGroup lessons={shownUpcoming} today={today} renderAction={renderCancel}
                        emptyText="אין שיעורים קרובים. אפשר לקבוע שיעור בלוח הזמנים!" />
                )}
                {tab === "COMPLETED" && (
                    <LessonGroup lessons={shownCompleted} today={today} emptyText="עדיין אין שיעורים שהושלמו." />
                )}
                {tab === "CANCELLED" && (
                    <LessonGroup lessons={shownCancelled} today={today} muted emptyText="אין שיעורים שבוטלו." />
                )}
            </div>
        </div>
    );
}
