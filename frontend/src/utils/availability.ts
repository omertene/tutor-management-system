import { days, ROW_HEIGHT, timeToMinutes, toDateString } from "./time";
import type { AvailabilityWindow, ScheduleRule } from "../types/schedule";

/* Pure availability geometry shared by the calendar grids - turns
   rules/overrides/lessons into the minute maths the calendars need */

/* A time range, compared in minutes since midnight by the overlap tests below */
type Span = { startTime: string; endTime: string };

/* Half-open overlap: two spans collide when each starts before the other ends.
   Touching edges (10:00-11:00 and 11:00-12:00) do NOT overlap. */
export function overlaps(span: Span, startMinutes: number, endMinutes: number): boolean {
    return timeToMinutes(span.startTime) < endMinutes && timeToMinutes(span.endTime) > startMinutes;
}

/* Full containment - a quarter-hour only counts as covered when the rule or
   override spans the whole of it, not merely clips its edge */
export function contains(span: Span, startMinutes: number, endMinutes: number): boolean {
    return timeToMinutes(span.startTime) <= startMinutes && timeToMinutes(span.endTime) >= endMinutes;
}

/* Which of the 4 quarter-hour slots in this cell are bookable - a quarter is
   available if a weekly rule or an ADD override covers it and no BLOCK
   override does. Students never see overrides as their own thing: ADD looks
   like normal availability, BLOCK looks like normal unavailability. */
export function getRuleCoverageQuarters(
    dayIndex: number,
    hour: number,
    dateStr: string,
    scheduleRules: ScheduleRule[],
    scheduleOverrides: AvailabilityWindow[],
): boolean[] {
    const cellStart = hour * 60;

    return [0, 1, 2, 3].map((quarter) => {
        const quarterStart = cellStart + quarter * 15;
        const quarterEnd = quarterStart + 15;

        const coveredByRule = scheduleRules.some(
            (rule) => rule.dayOfWeek === days[dayIndex] && contains(rule, quarterStart, quarterEnd)
        );

        const coveredByAddOverride = scheduleOverrides.some(
            (override) => override.type === "ADD" && override.date === dateStr && contains(override, quarterStart, quarterEnd)
        );

        const coveredByBlockOverride = scheduleOverrides.some(
            (override) => override.type === "BLOCK" && override.date === dateStr && overlaps(override, quarterStart, quarterEnd)
        );

        return (coveredByRule || coveredByAddOverride) && !coveredByBlockOverride;
    });
}

/* Paints a partly-available cell as four stacked 25% bands, so a rule running
   08:15-09:00 shows as a quarter of gray above three quarters of white */
export function ruleCoverageBackground(quarters: boolean[]): string {
    const stops = quarters
        .map((covered, i) => {
            const from = i * 25;
            const to = from + 25;
            const color = covered ? "#ffffff" : "#e2e8f0";
            return `${color} ${from}%, ${color} ${to}%`;
        })
        .join(", ");
    return `linear-gradient(to bottom, ${stops})`;
}

/* Finds the first run of covered quarters in this hour cell, so a rule like
   08:15-13:00 resolves to a 08:15 start instead of leaving the whole 08:00
   row unclickable */
export function firstAvailableQuarterRun(quarters: boolean[]): { startQuarter: number; quarterCount: number } | null {
    const startQuarter = quarters.indexOf(true);
    if (startQuarter === -1) return null;

    let quarterCount = 0;
    for (let i = startQuarter; i < quarters.length && quarters[i]; i++) quarterCount++;

    return { startQuarter, quarterCount };
}

/* minutes-since-midnight -> "HH:MM" */
export function minutesToTime(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/* The clock time an hour cell's first bookable quarter starts at */
export function quarterRunStartTime(hour: number, startQuarter: number): string {
    return minutesToTime(hour * 60 + startQuarter * 15);
}

/* Clips a span to the visible hour window and converts it to absolute pixel
   offsets within the day column. Returns null when nothing is visible, so
   callers can drop it instead of rendering a zero-height block. */
export function toPositionedBlock<T extends Span>(
    item: T,
    hourStart: number,
    hourEnd: number,
): { item: T; top: number; height: number } | null {
    const windowStart = hourStart * 60;
    const windowEnd = hourEnd * 60;

    const startMinutes = Math.max(timeToMinutes(item.startTime), windowStart);
    const endMinutes = Math.min(timeToMinutes(item.endTime), windowEnd);
    const height = ((endMinutes - startMinutes) / 60) * ROW_HEIGHT;

    if (height <= 0) return null;

    return { item, top: ((startMinutes - windowStart) / 60) * ROW_HEIGHT, height };
}

/* "YYYY-MM-DD" for the given column of the visible week */
export function dayDateString(weekDates: Date[], dayIndex: number): string {
    return toDateString(weekDates[dayIndex]);
}

/* The TEACHER grid's coverage: weekly rules only, not overrides - the teacher
   sees overrides as their own colored blocks drawn on top, so shading the cell
   by them too would double-count */
export function getRuleOnlyCoverageQuarters(
    dayIndex: number,
    hour: number,
    scheduleRules: ScheduleRule[],
): boolean[] {
    const cellStart = hour * 60;

    return [0, 1, 2, 3].map((quarter) => {
        const quarterStart = cellStart + quarter * 15;
        const quarterEnd = quarterStart + 15;

        return scheduleRules.some(
            (rule) => rule.dayOfWeek === days[dayIndex] && contains(rule, quarterStart, quarterEnd)
        );
    });
}

/* Whether a rule overlaps this day/[startHour, endHour) range at all - matches
   the backend's own "any overlap" check, not "every quarter covered", so the
   popup only offers actions the backend will actually accept */
export function isRangeCoveredByRule(
    dayIndex: number,
    startHour: number,
    endHour: number,
    scheduleRules: ScheduleRule[],
): boolean {
    const rangeStart = startHour * 60;
    const rangeEnd = endHour * 60;

    return scheduleRules.some(
        (rule) => rule.dayOfWeek === days[dayIndex] && overlaps(rule, rangeStart, rangeEnd)
    );
}

/* "08:00" for hour 8 - the whole-hour boundary a drag-selected range snaps to.
   Hour 24 (end of day) is clamped to 23:45 instead of "24:00", which isn't a
   valid LocalTime on the backend. */
export function hourToTime(hour: number): string {
    if (hour >= 24) return "23:45";
    return `${String(hour).padStart(2, "0")}:00`;
}
