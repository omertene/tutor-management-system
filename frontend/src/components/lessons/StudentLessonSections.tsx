import { formatMoney } from "../../utils/money";
import { useState } from "react";
import ListPager from "../ListPager";
import { usePagination } from "../../hooks/usePagination";
import { formatShortDateString, formatTimeOfDay } from "../../utils/time";
import { formatRelativeLessonDate, statusStyles, studentStatusLabels, STUDENT_MIN_CANCEL_NOTICE_HOURS } from "../../types/lesson";
import type { Lesson } from "../../types/lesson";

const LESSONS_PER_PAGE = 10;

/* What the student sees instead of the teacher's single filterable table:
   their next lessons first, then history, with canceled ones tucked away
   behind a toggle. */

type StudentLessonSectionsProps = {
    upcoming: Lesson[];
    completed: Lesson[];
    cancelled: Lesson[];
    today: string;
    canCancel: (lesson: Lesson) => boolean;
    onCancel: (lesson: Lesson) => void;
};

const rowClass = "px-4 py-3 flex flex-wrap items-center justify-between gap-2";
const listClass = "bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100";
const emptyClass = "px-4 py-6 text-sm text-slate-500 text-center";
const badgeClass = "text-xs font-medium px-2 py-0.5 rounded-full";

export default function StudentLessonSections({
    upcoming, completed, cancelled, today, canCancel, onCancel,
}: StudentLessonSectionsProps) {
    const [showCancelledLessons, setShowCancelledLessons] = useState(false);

    const {
        page: upcomingPage, totalPages: upcomingTotalPages,
        visibleItems: visibleUpcoming, setPage: setUpcomingPage,
    } = usePagination(upcoming, LESSONS_PER_PAGE);

    const {
        page: completedPage, totalPages: completedTotalPages,
        visibleItems: visibleCompleted, setPage: setCompletedPage,
    } = usePagination(completed, LESSONS_PER_PAGE);

    return (
        <div className="mt-8 flex flex-col gap-8">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">שיעורים קרובים</h2>
                <div className={listClass}>
                    {upcoming.length === 0 && (
                        <p className={emptyClass}>אין שיעורים קרובים. אפשר לקבוע שיעור בדף הבית!</p>
                    )}
                    {visibleUpcoming.map((lesson) => (
                        <div key={lesson.id} className={rowClass}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900">
                                    {formatRelativeLessonDate(lesson.date, today)} {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                                </span>
                                <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                <span className="text-slate-500 text-sm">{formatMoney(lesson.priceAtBooking)}</span>
                                <span className={`${badgeClass} ${statusStyles[lesson.status]}`}>
                                    {studentStatusLabels[lesson.status]}
                                </span>
                            </div>

                            <button
                                onClick={() => onCancel(lesson)}
                                disabled={!canCancel(lesson)}
                                title={canCancel(lesson) ? undefined : `לא ניתן לבטל פחות מ-${STUDENT_MIN_CANCEL_NOTICE_HOURS} שעות לפני תחילת השיעור.`}
                                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                            >
                                ביטול
                            </button>
                        </div>
                    ))}
                </div>
                {upcoming.length > 0 && (
                    <ListPager
                        page={upcomingPage}
                        totalPages={upcomingTotalPages}
                        totalItems={upcoming.length}
                        perPage={LESSONS_PER_PAGE}
                        onChange={setUpcomingPage}
                    />
                )}
            </div>

            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">שיעורים שהושלמו</h2>
                <div className={listClass}>
                    {completed.length === 0 && (
                        <p className={emptyClass}>עדיין אין שיעורים שהושלמו.</p>
                    )}
                    {visibleCompleted.map((lesson) => (
                        <div key={lesson.id} className={rowClass}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900">
                                    {formatShortDateString(lesson.date)} {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                                </span>
                                <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                <span className="text-slate-500 text-sm">{formatMoney(lesson.priceAtBooking)}</span>
                                <span className={`${badgeClass} ${statusStyles[lesson.status]}`}>
                                    {studentStatusLabels[lesson.status]}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                {completed.length > 0 && (
                    <ListPager
                        page={completedPage}
                        totalPages={completedTotalPages}
                        totalItems={completed.length}
                        perPage={LESSONS_PER_PAGE}
                        onChange={setCompletedPage}
                    />
                )}
            </div>

            {cancelled.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowCancelledLessons((v) => !v)}
                        className="text-sm text-slate-400 hover:text-slate-600"
                    >
                        {showCancelledLessons ? "הסתרת" : "הצגת"} שיעורים שבוטלו ({cancelled.length})
                    </button>
                    {showCancelledLessons && (
                        <div className="mt-3 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                            {cancelled.map((lesson) => (
                                <div key={lesson.id} className="px-4 py-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                                    <span>
                                        {formatShortDateString(lesson.date)} {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                                    </span>
                                    <span>{lesson.subjectName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
