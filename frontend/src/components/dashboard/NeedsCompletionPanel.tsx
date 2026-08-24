import { useState } from "react";
import PanelPager from "./PanelPager";
import { formatTimeOfDay } from "../../utils/time";
import type { DashboardLesson } from "../../types/dashboard";

const NEEDS_COMPLETION_PAGE_SIZE = 3;

function formatDayMonth(date: string): string {
    const [, month, day] = date.split("-");
    return `${day}/${month}`;
}

type NeedsCompletionPanelProps = {
    lessons: DashboardLesson[];
    onComplete: (lessonId: number) => void;
    onCancel: (lessonId: number) => void;
};

export default function NeedsCompletionPanel({ lessons, onComplete, onCancel }: NeedsCompletionPanelProps) {
    const [page, setPage] = useState(0);

    const totalPages = Math.max(1, Math.ceil(lessons.length / NEEDS_COMPLETION_PAGE_SIZE));
    // clamped so completing the last lesson on the final page doesn't strand the pager
    const safePage = Math.min(page, totalPages - 1);
    const pageItems = lessons.slice(
        safePage * NEEDS_COMPLETION_PAGE_SIZE,
        (safePage + 1) * NEEDS_COMPLETION_PAGE_SIZE
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Needs completion</h2>
            </div>
            <div className="divide-y divide-slate-100">
                {lessons.length === 0 && (
                    <p className="px-6 py-6 text-sm text-slate-500 text-center">Nothing to mark.</p>
                )}
                {pageItems.map((lesson) => (
                    <div key={lesson.id} className="px-6 py-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-900 text-sm font-medium">
                                {formatDayMonth(lesson.date)} {formatTimeOfDay(lesson.startTime)}
                            </span>
                            <span className="text-slate-500 text-xs">
                                {lesson.studentFirstName} {lesson.studentLastName}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onComplete(lesson.id)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                Mark completed
                            </button>
                            <button
                                onClick={() => onCancel(lesson.id)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {lessons.length > NEEDS_COMPLETION_PAGE_SIZE && (
                <PanelPager page={safePage} totalPages={totalPages} onChange={setPage} />
            )}
        </div>
    );
}
