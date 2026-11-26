import type { ReactNode } from "react";
import { dayLabels, DEFAULT_HOUR_START, DEFAULT_HOUR_END, MIN_HOUR, MAX_HOUR, ROW_HEIGHT, formatShortDate } from "../utils/time";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

type WeekGridProps = {
    weekDates: Date[];
    hourStart: number;
    hourEnd: number;
    onHourStartChange: (updater: (current: number) => number) => void;
    onHourEndChange: (updater: (current: number) => number) => void;
    onPreviousWeek: () => void;
    onNextWeek: () => void;
    /* Optional "back to this week" button, shown only while another week is displayed */
    onCurrentWeek?: () => void;
    isCurrentWeek?: boolean;
    todayDayIndex: number;
    showNowLine: boolean;
    nowLineTop: number;
    /* "week" draws the now-line across every day, "day" only across today's column */
    nowLineScope?: "day" | "week";
    /* CSS max-height for the grid card; when set the card scrolls inside itself and keeps the day header pinned */
    maxHeight?: string;
    /* "cards": every cell is its own rounded block with gaps (no table lines) - used by the student view */
    variant?: "table" | "cards";
    /* Which days (0 = Sunday) to draw; default all seven. The student view shows one day at a time on phones */
    visibleDays?: number[];
    /* Optional extra row under the week navigation (the phone day picker) */
    dayStrip?: ReactNode;
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
    onCurrentWeek,
    isCurrentWeek = true,
    todayDayIndex,
    showNowLine,
    nowLineTop,
    nowLineScope = "week",
    maxHeight,
    variant = "table",
    visibleDays = ALL_DAYS,
    dayStrip,
    hours,
    renderDayColumn,
}: WeekGridProps) {
    const cards = variant === "cards";
    const columnCount = visibleDays.length;
    const todayPosition = visibleDays.indexOf(todayDayIndex);
    return (
        <>
            <div className="flex items-center justify-between">
                <button
                    onClick={onPreviousWeek}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    &rarr; השבוע הקודם
                </button>
                <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <span dir="ltr">{formatShortDate(weekDates[0])} &ndash; {formatShortDate(weekDates[6])}</span>
                    {onCurrentWeek && !isCurrentWeek && (
                        <button
                            onClick={onCurrentWeek}
                            className="rounded-full bg-[#eef1f8] px-3 py-1 text-xs font-semibold text-[#1e2a66] hover:bg-[#dfe4f2] transition-colors"
                        >
                            חזרה להיום
                        </button>
                    )}
                </span>
                <button
                    onClick={onNextWeek}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    השבוע הבא &larr;
                </button>
            </div>

            {dayStrip && <div className="mt-3">{dayStrip}</div>}

            <div className="mt-4 flex items-center justify-between">
                {hourStart > MIN_HOUR ? (
                    <button
                        onClick={() => onHourStartChange((current) => Math.max(MIN_HOUR, current - 2))}
                        className="text-sm text-[#27377d] hover:text-[#18214f] font-medium"
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

            <div className={`mt-2 bg-white border border-slate-200 shadow-sm overflow-auto ${cards ? "rounded-2xl p-4" : "rounded-xl"}`} style={maxHeight ? { maxHeight } : undefined}>
                <div className={`grid items-start ${columnCount === 7 ? "min-w-[700px]" : ""} ${cards ? "gap-x-2" : ""}`} style={{ gridTemplateColumns: `60px repeat(${columnCount}, minmax(0, 1fr))` }}>
                    <div className={`self-stretch ${cards ? "" : "border-b border-e border-slate-200 bg-slate-50"} ${maxHeight ? "sticky top-0 z-20" : ""}`} />
                    {visibleDays.map((dayIndex) => (
                        <div
                            key={dayIndex}
                            className={`px-2 text-center ${cards ? `mb-2 rounded-xl py-2 ${dayIndex === todayDayIndex ? "bg-[#1e2a66]" : ""}` : "border-b border-e border-slate-200 bg-slate-50 py-2.5"} ${maxHeight ? "sticky top-0 z-20" : ""}`}
                        >
                            <p className={`text-xs font-medium ${dayIndex === todayDayIndex ? (cards ? "text-[#c7d2fe]" : "text-[#27377d]") : "text-slate-500"}`}>{dayLabels[dayIndex]}</p>
                            <p className="mt-0.5">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${dayIndex === todayDayIndex ? (cards ? "text-white" : "bg-[#1e2a66] text-white") : "text-slate-900"}`}>{formatShortDate(weekDates[dayIndex])}</span>
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
                                style={{ top: `${index * ROW_HEIGHT + (cards ? ROW_HEIGHT / 2 : 0)}px` }}
                                className="absolute inset-x-0 -translate-y-1/2 text-center text-xs text-slate-400"
                            >
                                {String(hour).padStart(2, "0")}:00
                            </div>
                        ))}
                    </div>

                    {visibleDays.map((dayIndex, position) => (
                        <div key={dayIndex} style={{ gridColumnStart: position + 2, gridRowStart: 2 }} className={cards ? "relative" : `relative border-e border-slate-200 ${dayIndex === todayDayIndex ? "ring-1 ring-inset ring-[#c7cde6]" : ""}`}>
                            {renderDayColumn(dayIndex)}

                        </div>
                    ))}

                    {showNowLine && todayPosition !== -1 && (
                        <div className="pointer-events-none relative z-10 row-start-2 h-0" style={{ gridColumn: `2 / span ${columnCount}` }}>
                            <div
                                className="absolute border-t-2 border-red-500/70"
                                style={nowLineScope === "day"
                                    ? { top: `${nowLineTop}px`, insetInlineStart: `calc(${todayPosition} * 100% / ${columnCount})`, width: `calc(100% / ${columnCount})` }
                                    : { top: `${nowLineTop}px`, insetInlineStart: 0, insetInlineEnd: 0 }}
                            >
                                <span
                                    className="absolute -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500"
                                    style={{ insetInlineStart: nowLineScope === "day" ? 0 : `calc(${todayPosition} * 100% / ${columnCount})` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {hourEnd < MAX_HOUR && (
                <button
                    onClick={() => onHourEndChange((current) => Math.min(MAX_HOUR, current + 2))}
                    className="mt-2 text-sm text-[#27377d] hover:text-[#18214f] font-medium"
                >
                    &darr; הצגת שעות מאוחרות
                </button>
            )}
        </>
    );
}

export default WeekGrid;
