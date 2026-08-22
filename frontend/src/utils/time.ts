// shared date/time helpers used by every weekly-calendar view (SchedulePage,
// StudentScheduleGrid) and every lesson-time form (LessonsPage, TeacherDashboard).
// these used to be copy-pasted verbatim into all four files - pulled out here so a
// fix only has to happen once, and so the two calendar grids can't quietly drift
// apart on what "the same" date/time math means (see WeekGrid.tsx for the shared
// grid shell that also used to be duplicated)

export const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
export const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// the grid shows this many hour rows, starting at HOUR_START
export const DEFAULT_HOUR_START = 8;
export const DEFAULT_HOUR_END = 22;
export const MIN_HOUR = 0;
export const MAX_HOUR = 24;
export const ROW_HEIGHT = 48; // px, must match the h-12 cell height in WeekGrid

export const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
export const MINUTE_OPTIONS: string[] = ["00", "15", "30", "45"];

// adds 1 hour to a "HH:MM" time, wrapping past midnight if needed
export function addOneHour(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    const nextHour = (hours + 1) % 24;
    return `${String(nextHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Monday-based week start isn't used here - the grid is Sunday-first to match
// the `days` order used by schedule rules
export function getStartOfWeek(reference: Date): Date {
    const result = new Date(reference);
    result.setDate(result.getDate() - result.getDay());
    result.setHours(0, 0, 0, 0);
    return result;
}

// formats using the browser's local date fields (not toISOString, which converts
// to UTC first and can shift the date by a day depending on timezone)
export function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function formatShortDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
}

export function minutesSinceMidnight(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
}
