import type { ReactNode } from "react";
import { dayLabels, DEFAULT_HOUR_START, DEFAULT_HOUR_END, MIN_HOUR, MAX_HOUR, ROW_HEIGHT, formatShortDate } from "../utils/time";

type WeekGridProps = {
    weekDates: Date[];
    hourStart: number;
    hourEnd: number;
    onHourStartChange: (updater: (current: number) => number) => void;
    onHourEndChange: (updater: (current: number) => number) => void;
    onPreviousWeek: () => void;
    onNextWeek: () => void;
    todayDayIndex: number;
    showNowLine: boolean;
    nowLineTop: number;
    hours: number[];
    // each grid's own cell/override/lesson/busy-slot rendering stays owned by the
    // caller (teacher and student grids differ too much here to share safely -
    // drag-select vs click, override blocks vs busy-slot blocks, different data
    // entirely) - WeekGrid only owns the chrome that's genuinely identical: the
    // week nav, hour-window controls, day header row, and hour gutter/now-line
    renderDayColumn: (dayIndex: number) => ReactNode;
};

// shared shell for the two weekly calendar views (teacher's SchedulePage,
// student's StudentScheduleGrid) - used to be copy-pasted verbatim in both,
// down to the exact classNames, which meant any layout tweak had to be made
// twice and could quietly drift apart
function WeekGrid({
    weekDates,
    hourStart,
    hourEnd,
    onHourStartChange,
    onHourEndChange,
    onPreviousWeek,
    onNextWeek,
    todayDayIndex,
    showNowLine,
    nowLineTop,
    hours,
    renderDayColumn,
}: WeekGridProps) {
    return (
        <>
            <div className="flex items-center justify-between">
                <button
                    onClick={onPreviousWeek}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    &larr; Previous week
                </button>
                <span className="text-sm font-medium text-slate-700">
                    {formatShortDate(weekDates[0])} &ndash; {formatShortDate(weekDates[6])}
                </span>
                <button
                    onClick={onNextWeek}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    Next week &rarr;
                </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
                {hourStart > MIN_HOUR ? (
                    <button
                        onClick={() => onHourStartChange((current) => Math.max(MIN_HOUR, current - 2))}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        &uarr; Show earlier hours
                    </button>
                ) : <span />}
                {(hourStart !== DEFAULT_HOUR_START || hourEnd !== DEFAULT_HOUR_END) && (
                    <button
                        onClick={() => { onHourStartChange(() => DEFAULT_HOUR_START); onHourEndChange(() => DEFAULT_HOUR_END); }}
                        className="text-sm text-slate-400 hover:text-slate-600"
                    >
                        Reset hours
                    </button>
                )}
            </div>

            <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <div className="min-w-[700px] grid grid-cols-[60px_repeat(7,1fr)] items-start">
                    <div className="border-b border-slate-100" />
                    {dayLabels.map((label, dayIndex) => (
                        <div
                            key={label}
                            className={`border-b border-l border-slate-100 px-2 py-2 text-center ${dayIndex === todayDayIndex ? "bg-indigo-50" : ""}`}
                        >
                            <p className={`text-xs font-medium ${dayIndex === todayDayIndex ? "text-indigo-500" : "text-slate-500"}`}>{label}</p>
                            <p className={`text-sm font-semibold ${dayIndex === todayDayIndex ? "text-indigo-700" : "text-slate-900"}`}>{formatShortDate(weekDates[dayIndex])}</p>
                        </div>
                    ))}

                    <div className="relative">
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                style={{ height: `${ROW_HEIGHT}px`, boxSizing: "border-box" }}
                                className="border-b border-slate-300"
                            />
                        ))}
                        {hours.map((hour, index) => (
                            <div
                                key={hour}
                                style={{ top: `${index * ROW_HEIGHT}px` }}
                                className="absolute right-2 -translate-y-1/2 text-xs text-slate-400"
                            >
                                {String(hour).padStart(2, "0")}:00
                            </div>
                        ))}
                    </div>

                    {dayLabels.map((_, dayIndex) => (
                        <div key={dayIndex} className="relative border-l border-slate-100">
                            {renderDayColumn(dayIndex)}

                            {dayIndex === todayDayIndex && showNowLine && (
                                <div
                                    className="absolute left-0 right-0 pointer-events-none border-t-2 border-red-500 z-10"
                                    style={{ top: `${nowLineTop}px` }}
                                >
                                    <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {hourEnd < MAX_HOUR && (
                <button
                    onClick={() => onHourEndChange((current) => Math.min(MAX_HOUR, current + 2))}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    &darr; Show later hours
                </button>
            )}
        </>
    );
}

export default WeekGrid;
