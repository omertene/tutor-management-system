import { days } from "../utils/time";

/* The shapes both calendar views (teacher's SchedulePage, student's
   StudentScheduleGrid) work with, defined once so both stay in sync */

export type ScheduleRule = {
    id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
};

/* The two override shapes are separate types rather than one type with optional
   fields, since the student endpoint strips the id and the teacher's note - a
   student-shaped value should never flow into code that needs a real id. */

/* What the student grid receives: enough to shade the calendar, nothing more */
export type AvailabilityWindow = {
    date: string;
    startTime: string;
    endTime: string;
    type: string;
};

/* What the teacher page receives: the editable row */
export type ScheduleOverride = AvailabilityWindow & {
    id: number;
    note: string;
};

/* A booked slot belonging to another student - no name or subject, used only to
   grey out the grid so a student can't try to book an already-taken time */
export type BusySlot = {
    date: string;
    startTime: string;
    endTime: string;
};

/* Sorts rules the way the weekly editor lists them: by day of week, then start time */
export function sortRules(rules: ScheduleRule[]): ScheduleRule[] {
    return [...rules].sort((a, b) => {
        const dayDiff = days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
    });
}

/* One of the student's own lessons, as the student grid receives it - no
   student name (they're the only student it can be) and no price */
export type StudentLesson = {
    id: number;
    subjectName: string;
    subjectId: number;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
};

export type Subject = {
    id: number;
    name: string;
};

/* A lesson as the TEACHER's schedule receives it - includes the student's name/id
   (the teacher has many students) and the private per-lesson notes */
export type TeacherLesson = {
    id: number;
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    subjectName: string;
    subjectId: number;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    notes: string | null;
};

export type TeacherStudent = {
    id: number;
    firstName: string;
    lastName: string;
};
