import { formatShortDateString } from "../utils/time";

/* Lesson shape and the small helpers/constants that work with it */
export type Lesson = {
    id: number;
    studentFirstName: string;
    studentLastName: string;
    subjectName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    subjectId: number;
    priceAtBooking: number;
    notes: string;
}

export const statusStyles: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-slate-100 text-slate-500",
};

/* The teacher's list shows the raw status; a student sees friendlier wording */
export const studentStatusLabels: Record<string, string> = {
    SCHEDULED: "Upcoming",
    COMPLETED: "Done",
    CANCELLED: "Cancelled",
};

/* Students can't cancel a lesson that starts within this many hours */
export const STUDENT_MIN_CANCEL_NOTICE_HOURS = 6;

/* "2026-08-17" -> "Today" / "Tomorrow" / "7/10/26", relative to todayStr */
export function formatRelativeLessonDate(date: string, todayStr: string): string {
    if (date === todayStr) return "Today";

    const today = new Date(`${todayStr}T00:00:00`);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`) {
        return "Tomorrow";
    }

    return formatShortDateString(date);
}

/* "2025-08-17" -> "2025-08" - zero-padded so a plain string sort (used for the
   filter dropdown) matches chronological order */
export function lessonMonthKey(date: string): string {
    const [year, month] = date.split("-");
    return `${year}-${month.padStart(2, "0")}`;
}

/* A lesson can only be marked completed once it's actually started - takes
   date/time fields rather than a whole Lesson so it works for the differently-
   shaped lesson objects used by the schedule modal and the lessons list */
export function hasLessonStarted(lesson: { date: string; startTime: string }): boolean {
    const [year, month, day] = lesson.date.split("-").map(Number);
    const [hours, minutes] = lesson.startTime.slice(0, 5).split(":").map(Number);
    const lessonStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return lessonStart <= new Date();
}
