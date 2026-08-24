// shapes the teacher dashboard works with

export type DashboardLesson = {
    id: number;
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    subjectName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
};

export type Debt = {
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    debt: number;
};
