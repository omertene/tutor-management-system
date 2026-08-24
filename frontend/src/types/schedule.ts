import { days } from "../utils/time";

// the shapes both calendar views work with. SchedulePage (teacher) and
// StudentScheduleGrid (student) each declared their own copies of these, which is how
// they drifted apart on what "available" meant - the student grid required all four
// quarter-hours of a cell to be rule-covered while the teacher page used any overlap.
// one definition each now, so a change lands in both views at once.

export type ScheduleRule = {
    id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
};

// the two override shapes are deliberately separate types rather than one type with
// optional fields. GET /teacher/schedule-overrides returns the full row; the student
// endpoint strips the id and the teacher's private note (see
// StudentAvailabilityController). modelling that as `id?: number` would push a null
// check onto the teacher page, which always has an id, and would let a student-shaped
// value flow into code that needs one.

// what the student grid receives: enough to shade the calendar, nothing more
export type AvailabilityWindow = {
    date: string;
    startTime: string;
    endTime: string;
    type: string;
};

// what the teacher page receives: the editable row
export type ScheduleOverride = AvailabilityWindow & {
    id: number;
    note: string;
};

// a booked slot belonging to another student - no name or subject, used only to grey
// out the grid so a student can't try to book a time that's already taken
export type BusySlot = {
    date: string;
    startTime: string;
    endTime: string;
};

// rules sorted the way the weekly editor lists them: by day of week, then start time
export function sortRules(rules: ScheduleRule[]): ScheduleRule[] {
    return [...rules].sort((a, b) => {
        const dayDiff = days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
    });
}

// one of the student's own lessons as the student grid receives it - no student
// name (they're the only student it can be) and no price
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

// a lesson as the TEACHER's schedule receives it - includes the student's name and
// id (the teacher has many students) and the private per-lesson notes
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
