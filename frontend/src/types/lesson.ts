import { formatShortDateString } from "../utils/time";

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

// the teacher's list shows the raw status; a student sees friendlier wording
export const studentStatusLabels: Record<string, string> = {
    SCHEDULED: "Upcoming",
    COMPLETED: "Done",
    CANCELLED: "Cancelled",
};

// students can't cancel a lesson that starts within this many hours
export const STUDENT_MIN_CANCEL_NOTICE_HOURS = 6;

// "2026-08-17" -> "Today" / "Tomorrow" / "7/10/26", relative to the given today string
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

// "2025-08-17" -> "2025-08" - zero-padded so plain string sort (used to order the
// filter dropdown) matches chronological order. an unpadded "2025-8" would sort
// after "2025-10"/"2025-11"/"2025-12" ("1" < "8" lexicographically), pushing autumn
// months above summer ones in the list
export function lessonMonthKey(date: string): string {
    const [year, month] = date.split("-");
    return `${year}-${month.padStart(2, "0")}`;
}
