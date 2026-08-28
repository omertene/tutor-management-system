import { smallSecondaryButtonClass } from "../../constants/formStyles";
import { formatShortDateString, formatTimeOfDay } from "../../utils/time";
import { hasLessonStarted, statusStyles } from "../../types/lesson";
import type { Lesson } from "../../types/lesson";

/* One row in the teacher's lesson table - shows the lesson info plus the
   actions available for its current status (complete/cancel/void). */

type TeacherLessonRowProps = {
    lesson: Lesson;
    canCancel: boolean;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
    onCloseMenu: () => void;
    onComplete: (lessonId: number) => void;
    onCancel: (lesson: Lesson) => void;
};

/* Menu open state comes from the parent, not local state - so only one
   row's menu can be open at once */
export default function TeacherLessonRow({
    lesson, canCancel, isMenuOpen, onToggleMenu, onCloseMenu, onComplete, onCancel,
}: TeacherLessonRowProps) {
    return (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-900">
                    {formatShortDateString(lesson.date)} {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                </span>
                <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                <span className="text-slate-500 text-sm">
                    {lesson.studentFirstName} {lesson.studentLastName}
                </span>
                <span className="text-slate-500 text-sm">
                    ₪{lesson.priceAtBooking}
                </span>
                <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[lesson.status] ?? "bg-slate-100 text-slate-500"}`}
                >
                    {lesson.status}
                </span>
            </div>

            <div className="flex gap-2 relative">
                {/* backend rejects completing a lesson before it starts */}
                {lesson.status === "SCHEDULED" && hasLessonStarted(lesson) && (
                    <button onClick={() => onComplete(lesson.id)} className={smallSecondaryButtonClass}>
                        Mark completed
                    </button>
                )}
                {/* completed lessons count as real income, so cancelling one is
                    tucked in the "..." menu instead of a plain button */}
                {lesson.status === "SCHEDULED" && canCancel && (
                    <button
                        onClick={() => onCancel(lesson)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                        Cancel
                    </button>
                )}
                {lesson.status === "COMPLETED" && canCancel && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={onToggleMenu}
                            title="More actions"
                            aria-label="More actions"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            &#8942;
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-md py-1 w-44">
                                <button
                                    onClick={() => {
                                        onCloseMenu();
                                        onCancel(lesson);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    Void / Cancel Lesson
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
