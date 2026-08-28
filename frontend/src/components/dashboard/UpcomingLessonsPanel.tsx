import { formatTimeOfDay } from "../../utils/time";
import type { DashboardLesson } from "../../types/dashboard";

/* Dashboard panel showing today's and tomorrow's lessons side by side, no
   paging since it's only ever these two days. */

/* "2026-11-24" -> "24/11" */
function formatDayMonth(date: string): string {
    const [, month, day] = date.split("-");
    return `${day}/${month}`;
}

type UpcomingLessonsPanelProps = {
    todaysLessons: DashboardLesson[];
    tomorrowsLessons: DashboardLesson[];
};

export default function UpcomingLessonsPanel({ todaysLessons, tomorrowsLessons }: UpcomingLessonsPanelProps) {
    return (
        <div className="lg:order-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Today</h2>
            </div>
            <div className="divide-y divide-slate-100">
                {todaysLessons.length === 0 && (
                    <p className="px-6 py-6 text-sm text-slate-500 text-center">No lessons today.</p>
                )}
                {todaysLessons.map((lesson) => (
                    <div key={lesson.id} className="px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">
                            {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                        </span>
                        <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                        <span className="text-slate-500 text-sm">
                            {lesson.studentFirstName} {lesson.studentLastName}
                        </span>
                    </div>
                ))}
            </div>

            <div className="px-6 py-4 border-b border-t border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Tomorrow</h2>
            </div>
            <div className="divide-y divide-slate-100">
                {tomorrowsLessons.length === 0 && (
                    <p className="px-6 py-6 text-sm text-slate-500 text-center">No lessons tomorrow.</p>
                )}
                {tomorrowsLessons.map((lesson) => (
                    <div key={lesson.id} className="px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">
                            {formatDayMonth(lesson.date)} {formatTimeOfDay(lesson.startTime)}-{formatTimeOfDay(lesson.endTime)}
                        </span>
                        <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                        <span className="text-slate-500 text-sm">
                            {lesson.studentFirstName} {lesson.studentLastName}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
