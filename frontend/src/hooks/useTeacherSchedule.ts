import { useEffect, useMemo, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import { sortRules } from "../types/schedule";
import type { ScheduleRule, ScheduleOverride, Subject } from "../types/schedule";
import type { TeacherLesson, TeacherStudent } from "../types/schedule";
import {
    days,
    DEFAULT_HOUR_START, DEFAULT_HOUR_END,
    getStartOfWeek,
} from "../utils/time";

// everything the teacher's schedule page loads and mutates. the page itself is
// left with the grid rendering, the drag interaction, and the modals.
export function useTeacherSchedule() {
    const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
    const [hourStart, setHourStart] = useState(DEFAULT_HOUR_START);
    const [hourEnd, setHourEnd] = useState(DEFAULT_HOUR_END);

    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
    const [lessons, setLessons] = useState<TeacherLesson[]>([]);
    const [students, setStudents] = useState<TeacherStudent[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    // drives the red "now" line; a minute's resolution is all the line needs
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    async function loadOverrides() {
        const response = await apiFetch(`/teacher/schedule-overrides`);
        if (!response.ok) return;
        setScheduleOverrides((await response.json()) as ScheduleOverride[]);
    }

    useEffect(() => {
        async function load() {
            const [rulesRes, overridesRes, lessonsRes, studentsRes, subjectsRes] = await Promise.all([
                apiFetch(`/teacher/schedule-rules`),
                apiFetch(`/teacher/schedule-overrides`),
                apiFetch(`/teacher/lessons`),
                apiFetch(`/teacher/students`),
                apiFetch(`/subjects`),
            ]);

            if (rulesRes.ok) setScheduleRules(sortRules((await rulesRes.json()) as ScheduleRule[]));
            if (overridesRes.ok) setScheduleOverrides((await overridesRes.json()) as ScheduleOverride[]);
            if (lessonsRes.ok) {
                const data = (await lessonsRes.json()) as TeacherLesson[];
                setLessons(data.filter((lesson) => lesson.status !== "CANCELLED"));
            }
            if (studentsRes.ok) setStudents((await studentsRes.json()) as TeacherStudent[]);
            if (subjectsRes.ok) setSubjects((await subjectsRes.json()) as Subject[]);
        }
        load();
    }, []);

    const weekDates = useMemo(() => {
        return days.map((_, index) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);
            return date;
        });
    }, [weekStart]);

    const hours = useMemo(() => {
        const result: number[] = [];
        for (let hour = hourStart; hour < hourEnd; hour++) result.push(hour);
        return result;
    }, [hourStart, hourEnd]);

    function goToPreviousWeek() {
        setWeekStart((current) => {
            const previous = new Date(current);
            previous.setDate(current.getDate() - 7);
            return previous;
        });
    }

    function goToNextWeek() {
        setWeekStart((current) => {
            const next = new Date(current);
            next.setDate(current.getDate() + 7);
            return next;
        });
    }

    // creates or updates a lesson. bookingOutsideHours routes to the endpoint that
    // creates an ADD override alongside the lesson, so the override list is refetched
    // afterwards. returns an error message for the modal, or null on success
    async function saveLesson(
        body: { studentId: number; subjectId: number; date: string; startTime: string; endTime: string },
        editingLessonId: number | null,
        bookingOutsideHours: boolean,
    ): Promise<string | null> {
        const isEditing = editingLessonId !== null;

        const url = isEditing
            ? `/teacher/lessons/${editingLessonId}`
            : bookingOutsideHours
                ? `/teacher/lessons/book-outside-hours`
                : `/teacher/lessons`;

        const response = await apiFetch(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return await readErrorMessage(response, isEditing ? "Failed to update lesson" : "Failed to create lesson");
        }

        const saved: TeacherLesson = await response.json();
        setLessons((current) => (isEditing
            ? current.map((lesson) => (lesson.id === saved.id ? saved : lesson))
            : [...current, saved]));
        if (!isEditing && bookingOutsideHours) loadOverrides();
        return null;
    }

    async function saveOverride(
        body: { date: string; startTime: string; endTime: string; type: string; note: string },
        editingOverrideId: number | null,
    ): Promise<string | null> {
        const isEditing = editingOverrideId !== null;

        const response = await apiFetch(
            isEditing ? `/teacher/schedule-overrides/${editingOverrideId}` : `/teacher/schedule-overrides`,
            {
                method: isEditing ? "PUT" : "POST",
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            return await readErrorMessage(response, isEditing ? "Failed to update override" : "Failed to add override");
        }

        const saved: ScheduleOverride = await response.json();
        setScheduleOverrides((current) => (isEditing
            ? current.map((override) => (override.id === saved.id ? saved : override))
            : [...current, saved]));
        return null;
    }

    async function saveNotes(lessonId: number, notes: string): Promise<TeacherLesson | null> {
        setErrorMessage("");

        const response = await apiFetch(`/teacher/lessons/${lessonId}/notes`, {
            method: "PATCH",
            body: JSON.stringify({ notes }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to save notes"));
            return null;
        }

        const updated: TeacherLesson = await response.json();
        setLessons((current) => current.map((lesson) => (lesson.id === updated.id ? updated : lesson)));
        return updated;
    }

    async function completeLesson(lessonId: number): Promise<boolean> {
        setErrorMessage("");

        const response = await apiFetch(`/teacher/lessons/${lessonId}/complete`, { method: "PATCH" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to mark lesson as completed"));
            return false;
        }

        const updated: TeacherLesson = await response.json();
        setLessons((current) => current.map((lesson) => (lesson.id === updated.id ? updated : lesson)));
        return true;
    }

    // cancelling a lesson doesn't delete it - it's a soft cancel (status -> CANCELLED),
    // same as everywhere else lessons are cancelled in the app. it just disappears
    // from this screen since cancelled lessons no longer occupy any time
    async function cancelLesson(lessonId: number): Promise<boolean> {
        setErrorMessage("");

        const response = await apiFetch(`/lessons/${lessonId}`, { method: "DELETE" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to cancel lesson"));
            return false;
        }

        setLessons((current) => current.filter((lesson) => lesson.id !== lessonId));
        return true;
    }

    async function deleteOverride(overrideId: number): Promise<boolean> {
        setErrorMessage("");

        const response = await apiFetch(`/teacher/schedule-overrides/${overrideId}`, { method: "DELETE" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete override"));
            return false;
        }

        setScheduleOverrides((current) => current.filter((override) => override.id !== overrideId));
        return true;
    }

    return {
        weekDates, hours,
        hourStart, hourEnd, setHourStart, setHourEnd,
        goToPreviousWeek, goToNextWeek,
        scheduleRules, setScheduleRules, scheduleOverrides, lessons, students, subjects,
        now,
        errorMessage,
        saveLesson, saveOverride, saveNotes,
        completeLesson, cancelLesson, deleteOverride,
    };
}
