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
    /* Each grid's own cell/override/lesson rendering stays owned by the caller -
       teacher and student grids differ too much to share safely (drag-select vs
       click, different block types). WeekGrid only owns the shared chrome: week
       nav, hour-window controls, day header row, and hour gutter/now-line. */
    renderDayColumn: (dayIndex: number) => ReactNode;
};

/* Shared shell for the two weekly calendar views (teacher's SchedulePage,
   student's StudentScheduleGrid) */
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
                    &rarr; השבוע הקודם
                </button>
                <span className="text-sm font-medium text-slate-700">
                    {formatShortDate(weekDates[0])} &ndash; {formatShortDate(weekDates[6])}
                </span>
                <button
                    onClick={onNextWeek}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    השבוע הבא &larr;
                </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
                {hourStart > MIN_HOUR ? (
                    <button
                        onClick={() => onHourStartChange((current) => Math.max(MIN_HOUR, current - 2))}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        &uarr; הצגת שעות מוקדמות
                    </button>
                ) : <span />}
                {(hourStart !== DEFAULT_HOUR_START || hourEnd !== DEFAULT_HOUR_END) && (
                    <button
                        onClick={() => { onHourStartChange(() => DEFAULT_HOUR_START); onHourEndChange(() => DEFAULT_HOUR_END); }}
                        className="text-sm text-slate-400 hover:text-slate-600"
                    >
                        איפוס שעות
                    </button>
                )}
            </div>

            <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <div className="min-w-[700px] grid grid-cols-[60px_repeat(7,1fr)] items-start">
                    <div className="border-b border-slate-200 bg-slate-50" />
                    {dayLabels.map((label, dayIndex) => (
                        <div
                            key={label}
                            className={`border-b border-e border-slate-200 bg-slate-50 px-2 py-2.5 text-center`}
                        >
                            <p className={`text-xs font-medium ${dayIndex === todayDayIndex ? "text-indigo-500" : "text-slate-500"}`}>{label}</p>
                            <p className="mt-0.5">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${dayIndex === todayDayIndex ? "bg-indigo-600 text-white" : "text-slate-900"}`}>{formatShortDate(weekDates[dayIndex])}</span>
                            </p>
                        </div>
                    ))}

                    <div className="relative col-start-1 row-start-2">
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                style={{ height: `${ROW_HEIGHT}px`, boxSizing: "border-box" }}
                                className=""
                            />
                        ))}
                        {hours.map((hour, index) => (
                            <div
                                key={hour}
                                style={{ top: `${index * ROW_HEIGHT}px` }}
                                className="absolute inset-x-0 -translate-y-1/2 text-center text-xs text-slate-400"
                            >
                                {String(hour).padStart(2, "0")}:00
                            </div>
                        ))}
                    </div>

                    {dayLabels.map((_, dayIndex) => (
                        <div key={dayIndex} style={{ gridColumnStart: dayIndex + 2, gridRowStart: 2 }} className={`relative border-e border-slate-200 ${dayIndex === todayDayIndex ? "ring-1 ring-inset ring-indigo-200" : ""}`}>
                            {renderDayColumn(dayIndex)}

                        </div>
                    ))}

                    {showNowLine && (
                        <div className="pointer-events-none relative z-10 col-span-7 col-start-2 row-start-2 h-0">
                            <div className="absolute inset-x-0 border-t-2 border-red-500/70" style={{ top: `${nowLineTop}px` }}>
                                <span
                                    className="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500"
                                    style={{ insetInlineStart: `calc(${todayDayIndex} * 100% / 7)` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {hourEnd < MAX_HOUR && (
                <button
                    onClick={() => onHourEndChange((current) => Math.min(MAX_HOUR, current + 2))}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    &darr; הצגת שעות מאוחרות
                </button>
            )}
        </>
    );
}

export default WeekGrid;
