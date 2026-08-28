/* Shared date/time helpers used by every weekly-calendar view (SchedulePage,
   StudentScheduleGrid) and every lesson-time form (LessonsPage, TeacherDashboard) */

export const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
export const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* The grid shows this many hour rows, starting at HOUR_START */
export const DEFAULT_HOUR_START = 8;
export const DEFAULT_HOUR_END = 22;
export const MIN_HOUR = 0;
export const MAX_HOUR = 24;
export const ROW_HEIGHT = 48; /* px, must match the h-12 cell height in WeekGrid */

export const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
export const MINUTE_OPTIONS: string[] = ["00", "15", "30", "45"];

/* Adds 1 hour to a "HH:MM" time, clamping at 23:45 instead of wrapping past
   midnight, since nothing in this app runs past midnight */
export function addOneHour(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    if (hours >= 23) return "23:45";
    return `${String(hours + 1).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/* Start of the week - Sunday-first, to match the `days` order used by schedule rules */
export function getStartOfWeek(reference: Date): Date {
    const result = new Date(reference);
    result.setDate(result.getDate() - result.getDay());
    result.setHours(0, 0, 0, 0);
    return result;
}

/* Formats using the browser's local date fields, not toISOString, which
   converts to UTC first and can shift the date by a day depending on timezone */
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

/* ---- display formatters ---- */

export const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* "2026-10-07" -> "7/10/26" */
export function formatShortDateString(date: string): string {
    const [year, month, day] = date.split("-");
    return `${Number(day)}/${Number(month)}/${year.slice(2)}`;
}

/* "2026-10-07T18:00:00" -> "7/10/26 18:00" */
export function formatDateTimeString(dateTime: string): string {
    const [datePart, timePart] = dateTime.split("T");
    const time = timePart ? timePart.slice(0, 5) : "";
    return `${formatShortDateString(datePart)} ${time}`;
}

/* "2026-10-07" + "18:00:00" -> "7/10/26 18:00" */
export function formatDateAndTime(date: string, time: string): string {
    return `${formatShortDateString(date)} ${time.slice(0, 5)}`;
}

/* "18:00:00" -> "18:00" */
export function formatTimeOfDay(time: string): string {
    return time.slice(0, 5);
}

/* Today as "YYYY-MM-DD" using local date fields, not toISOString */
export function todayDateString(): string {
    return toDateString(new Date());
}

/* 1.5 -> "1.5", 2 -> "2". Keeps whole hours clean instead of showing "2.0" */
export function formatHours(hours: number): string {
    return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}
