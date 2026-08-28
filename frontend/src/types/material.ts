export type MaterialType = "FILE" | "LINK" | "NOTE";

export type Material = {
    id: number;
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    lessonId: number | null;
    lessonDate: string | null;
    lessonStartTime: string | null;
    lessonSubject: string | null;
    title: string;
    description: string;
    type: MaterialType;
    url: string | null;
    fileName: string | null;
    uploadedAt: string;
};

/* The subset of a lesson the "attach to lesson" dropdown needs */
export type MaterialLesson = {
    id: number;
    subjectName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

export const typeStyles: Record<string, string> = {
    FILE: "bg-purple-50 text-purple-700",
    LINK: "bg-blue-50 text-blue-700",
    NOTE: "bg-amber-50 text-amber-700",
};
