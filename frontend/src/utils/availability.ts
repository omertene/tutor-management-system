import { days, ROW_HEIGHT, timeToMinutes, toDateString } from "./time";
import type { AvailabilityWindow, ScheduleRule } from "../types/schedule";

// pure availability geometry shared by the student grid. none of this touches
// React or the network - it turns rules/overrides/lessons into the minute maths
// the calendar needs, which makes each piece checkable on its own.

// a time range in minutes since midnight, which is what every overlap test below
// actually compares
type Span = { startTime: string; endTime: string };

// half-open overlap: two spans collide when each starts before the other ends.
// touching edges (10:00-11:00 and 11:00-12:00) deliberately do NOT overlap
export function overlaps(span: Span, startMinutes: number, endMinutes: number): boolean {
    return timeToMinutes(span.startTime) < endMinutes && timeToMinutes(span.endTime) > startMinutes;
}

// full containment, used for availability: a quarter-hour only counts as covered
// when the rule/override spans the whole of it, not merely clips its edge
export function contains(span: Span, startMinutes: number, endMinutes: number): boolean {
    return timeToMinutes(span.startTime) <= startMinutes && timeToMinutes(span.endTime) >= endMinutes;
}

// which of the 4 quarter-hour slots within this cell are actually bookable -
// a quarter counts as available if it's covered by a weekly rule OR an ADD
// override (the teacher explicitly opening up extra time), and NOT covered by
// a BLOCK override (which always wins over both). students never see overrides
// as their own distinct thing - an ADD override just looks/behaves like normal
// availability (white), a BLOCK override like normal unavailability (gray)
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

// paints a cell that's only partly available as four stacked 25% bands, so a rule
// running 08:15-09:00 shows as a quarter of gray above three quarters of white
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

// finds the first run of covered quarters within this hour cell, so a rule like
// 08:15-13:00 (quarters [false, true, true, true]) resolves to a 08:15 start
// instead of leaving the whole 08:00 row unclickable
export function firstAvailableQuarterRun(quarters: boolean[]): { startQuarter: number; quarterCount: number } | null {
    const startQuarter = quarters.indexOf(true);
    if (startQuarter === -1) return null;

    let quarterCount = 0;
    for (let i = startQuarter; i < quarters.length && quarters[i]; i++) quarterCount++;

    return { startQuarter, quarterCount };
}

// minutes-since-midnight -> "HH:MM"
export function minutesToTime(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// the clock time an hour cell's first bookable quarter actually starts at
export function quarterRunStartTime(hour: number, startQuarter: number): string {
    return minutesToTime(hour * 60 + startQuarter * 15);
}

// clips a span to the visible hour window and converts it to absolute pixel
// offsets within the day column. returns null when nothing of it is visible,
// so callers can drop it rather than render a zero-height block
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

// "YYYY-MM-DD" for the given column of the visible week
export function dayDateString(weekDates: Date[], dayIndex: number): string {
    return toDateString(weekDates[dayIndex]);
}

// the TEACHER grid's coverage: weekly rules only. deliberately NOT the same as
// getRuleCoverageQuarters above, which also folds in ADD/BLOCK overrides - the
// teacher sees overrides as their own colored blocks drawn on top, so shading the
// cell by them too would double-count. keeping these as two named functions is
// what stops a change to one silently altering the other view.
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

// whether a rule overlaps this day/[startHour, endHour) range AT ALL - matches
// the backend's own "coveredByRule" check in ScheduleOverrideService exactly
// (start < requestedEnd AND end > requestedStart). this has to be the same
// "any overlap" definition the backend uses, not "every quarter individually
// covered" - an override is a single flat range and the override table can't
// represent partial-hour coverage, so offering "Add availability"/"Block this
// time" based on a stricter frontend-only definition led the server to reject
// the exact action the popup had just offered (e.g. a rule starting at 08:15
// means the 08:00 cell isn't "fully available" by quarters, but the backend still
// sees 08:00-09:00 as already covered and refuses to add it again)
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

// "08:00" for hour 8 - the whole-hour boundary a drag-selected range snaps to
export function hourToTime(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`;
}
