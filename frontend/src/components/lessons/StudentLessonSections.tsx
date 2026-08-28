import { useState } from "react";
import { formatShortDateString, formatTimeOfDay } from "../../utils/time";
import { formatRelativeLessonDate, statusStyles, studentStatusLabels, STUDENT_MIN_CANCEL_NOTICE_HOURS } from "../../types/lesson";
import type { Lesson } from "../../types/lesson";

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

    return (
        <div className="mt-8 flex flex-col gap-8">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Upcoming</h2>
                <div className={listClass}>
                    {upcoming.length === 0 && (
                        <p className={emptyClass}>No upcoming lessons. Book one from the Schedule tab!</p>
                    )}
                    {upcoming.map((lesson) => (
                        <div key={lesson.id} className={rowClass}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900">
                                    {formatRelativeLessonDate(lesson.date, today)} {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                                </span>
                                <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                <span className="text-slate-500 text-sm">₪{lesson.priceAtBooking}</span>
                                <span className={`${badgeClass} ${statusStyles[lesson.status]}`}>
                                    {studentStatusLabels[lesson.status]}
                                </span>
                            </div>

                            <button
                                onClick={() => onCancel(lesson)}
                                disabled={!canCancel(lesson)}
                                title={canCancel(lesson) ? undefined : `Can't be cancelled within ${STUDENT_MIN_CANCEL_NOTICE_HOURS} hours of the start time.`}
                                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                            >
                                Cancel
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Completed</h2>
                <div className={listClass}>
                    {completed.length === 0 && (
                        <p className={emptyClass}>No completed lessons yet.</p>
                    )}
                    {completed.map((lesson) => (
                        <div key={lesson.id} className={rowClass}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900">
                                    {formatShortDateString(lesson.date)} {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                                </span>
                                <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                <span className="text-slate-500 text-sm">₪{lesson.priceAtBooking}</span>
                                <span className={`${badgeClass} ${statusStyles[lesson.status]}`}>
                                    {studentStatusLabels[lesson.status]}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {cancelled.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowCancelledLessons((v) => !v)}
                        className="text-sm text-slate-400 hover:text-slate-600"
                    >
                        {showCancelledLessons ? "Hide" : "Show"} {cancelled.length} cancelled
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
