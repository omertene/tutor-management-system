// the shapes GET /teacher/statistics/dashboard returns, mirroring
// DashboardStatisticsResponse on the backend

export type MonthlyTrend = {
    year: number;
    month: number;
    revenue: number;
    incomeReceived: number;
    hours: number;
};

export type SubjectPerformance = {
    subjectName: string;
    lessonCount: number;
    totalHours: number;
    totalRevenue: number;
};

export type StudentPerformance = {
    studentId: number;
    firstName: string;
    lastName: string;
    lessonCount: number;
    totalBilled: number;
};

export type DashboardStatistics = {
    totalRevenue: number;
    incomeReceived: number;
    totalLessons: number;
    totalHours: number;
    effectiveHourlyRate: number;
    monthlyTrend: MonthlyTrend[];
    subjectBreakdown: SubjectPerformance[];
    topStudents: StudentPerformance[];
};

export type RangeType = "month" | "year" | "allTime";
