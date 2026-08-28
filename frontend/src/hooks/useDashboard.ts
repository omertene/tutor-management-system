import { useCallback, useEffect, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import { timeToMinutes, toDateString } from "../utils/time";
import type { Student } from "../types";
import type { DashboardLesson, Debt } from "../types/dashboard";

/* All the dashboard's fetches plus the derived counts. Every mutation
   (complete/cancel a lesson) re-runs refresh() so the panels and stat row
   stay in sync with each other. */
export function useDashboard() {
    const [students, setStudents] = useState<Student[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [upcomingLessons, setUpcomingLessons] = useState<DashboardLesson[]>([]);
    const [needsCompletionLessons, setNeedsCompletionLessons] = useState<DashboardLesson[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);

    const [studentsThisMonthCount, setStudentsThisMonthCount] = useState(0);
    const [lessonsThisWeekCount, setLessonsThisWeekCount] = useState(0);
    const [minutesThisWeek, setMinutesThisWeek] = useState(0);
    const [revenueThisMonth, setRevenueThisMonth] = useState(0);

    /* Reloads all four dashboard fetches and updates the derived counts */
    const refresh = useCallback(async () => {
        const [studentsData, lessonsData, debtsData, revenueData] = await Promise.all([
            loadStudentsList(),
            loadLessonsData(),
            loadDebtsList(),
            loadRevenueThisMonth(),
        ]);

        if (studentsData) setStudents(studentsData);
        if (lessonsData) {
            setUpcomingLessons(lessonsData.upcoming);
            setNeedsCompletionLessons(lessonsData.needsCompletion);
            setLessonsThisWeekCount(lessonsData.thisWeekCount);
            setMinutesThisWeek(lessonsData.thisWeekMinutes);
            setStudentsThisMonthCount(lessonsData.studentsThisMonth);
        }
        if (debtsData) setDebts(debtsData);
        if (revenueData !== null) setRevenueThisMonth(revenueData);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    /* Marks a lesson as completed, then refreshes the dashboard */
    async function completeLesson(lessonId: number) {
        setErrorMessage("");
        const response = await apiFetch(`/teacher/lessons/${lessonId}/complete`, { method: "PATCH" });
        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to mark lesson as completed"));
            return;
        }
        refresh();
    }

    /* Cancels a still-SCHEDULED lesson - no confirm needed since nothing has been
       counted as revenue/debt yet */
    async function cancelLesson(lessonId: number) {
        setErrorMessage("");
        const response = await apiFetch(`/lessons/${lessonId}`, { method: "DELETE" });
        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to cancel lesson"));
            return;
        }
        refresh();
    }

    const todayDate = toDateString(new Date());

    return {
        students,
        errorMessage,
        todaysLessons: upcomingLessons.filter((lesson) => lesson.date === todayDate),
        tomorrowsLessons: upcomingLessons.filter((lesson) => lesson.date !== todayDate),
        needsCompletionLessons,
        debts,
        studentsThisMonthCount,
        lessonsThisWeekCount,
        minutesThisWeek,
        revenueThisMonth,
        refresh,
        completeLesson,
        cancelLesson,
    };
}

/* Loads the teacher's student list */
async function loadStudentsList(): Promise<Student[] | null> {
    const response = await apiFetch(`/teacher/students`);
    if (!response.ok) return null;
    return (await response.json()) as Student[];
}

type LessonsSummary = {
    upcoming: DashboardLesson[];
    needsCompletion: DashboardLesson[];
    thisWeekCount: number;
    thisWeekMinutes: number;
    studentsThisMonth: number;
};

/* Loads all lessons and derives the dashboard's upcoming/needs-completion lists
   and weekly/monthly counts */
async function loadLessonsData(): Promise<LessonsSummary | null> {
    const response = await apiFetch(`/teacher/lessons`);
    if (!response.ok) return null;

    const data: DashboardLesson[] = await response.json();
    const todayDate = toDateString(new Date());
    const tomorrowDate = toDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const scheduled = data.filter((lesson) => lesson.status === "SCHEDULED");

    /* Only shows today and tomorrow - a full week just duplicates the Schedule page */
    const upcoming = scheduled
        .filter((lesson) => lesson.date === todayDate || lesson.date === tomorrowDate)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const needsCompletion = scheduled
        .filter((lesson) => lesson.date < todayDate)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfWeekDate = toDateString(startOfWeek);
    const endOfWeekDate = toDateString(endOfWeek);

    const thisWeekLessons = data.filter(
        (lesson) => lesson.status !== "CANCELLED" && lesson.date >= startOfWeekDate && lesson.date <= endOfWeekDate
    );
    const thisWeekCount = thisWeekLessons.length;
    const thisWeekMinutes = thisWeekLessons.reduce(
        (total, lesson) => total + (timeToMinutes(lesson.endTime) - timeToMinutes(lesson.startTime)),
        0
    );

    /* Distinct students with a lesson (past or upcoming) in the current month -
       canceled lessons don't count since that student wasn't actually taught */
    const monthStr = todayDate.slice(0, 7);
    const studentsThisMonth = new Set(
        data
            .filter((lesson) => lesson.status !== "CANCELLED" && lesson.date.slice(0, 7) === monthStr)
            .map((lesson) => lesson.studentId)
    ).size;

    return { upcoming, needsCompletion, thisWeekCount, thisWeekMinutes, studentsThisMonth };
}

/* Loads debts and keeps only students who actually owe something */
async function loadDebtsList(): Promise<Debt[] | null> {
    const response = await apiFetch(`/teacher/debts`);
    if (!response.ok) return null;
    const data: Debt[] = await response.json();
    return data.filter((debt) => debt.debt > 0);
}

/* Loads this month's revenue total */
async function loadRevenueThisMonth(): Promise<number | null> {
    const response = await apiFetch(`/teacher/revenue/current-month`);
    if (!response.ok) return null;
    return (await response.json()) as number;
}
