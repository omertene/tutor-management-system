import { useEffect, useMemo, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { AvailabilityWindow, BusySlot, ScheduleRule, StudentLesson, Subject } from "../types/schedule";
import {
    days,
    DEFAULT_HOUR_START, DEFAULT_HOUR_END,
    getStartOfWeek, toDateString,
} from "../utils/time";

/* Everything the student schedule grid needs from the server, plus the
   week/hour window it is currently showing. The grid component is left with
   rendering only. */
export function useStudentSchedule() {
    const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
    const [hourStart, setHourStart] = useState(DEFAULT_HOUR_START);
    const [hourEnd, setHourEnd] = useState(DEFAULT_HOUR_END);

    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    const [scheduleOverrides, setScheduleOverrides] = useState<AvailabilityWindow[]>([]);
    const [lessons, setLessons] = useState<StudentLesson[]>([]);
    const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    /* Drives the red "now" line - a minute's resolution is all it needs */
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    /* Loads rules, overrides, lessons, and subjects once on mount. The
       student-facing endpoints return date/time/type only - no id, no teacher
       note - and lessons are already scoped to this student by the backend. */
    useEffect(() => {
        async function load() {
            const [rulesRes, overridesRes, lessonsRes, subjectsRes] = await Promise.all([
                apiFetch(`/student/schedule-rules`),
                apiFetch(`/student/schedule-overrides`),
                apiFetch(`/student/lessons`),
                apiFetch(`/subjects`),
            ]);

            if (rulesRes.ok) setScheduleRules((await rulesRes.json()) as ScheduleRule[]);
            if (overridesRes.ok) setScheduleOverrides((await overridesRes.json()) as AvailabilityWindow[]);
            if (lessonsRes.ok) {
                const data = (await lessonsRes.json()) as StudentLesson[];
                setLessons(data.filter((lesson) => lesson.status !== "CANCELLED"));
            }
            if (subjectsRes.ok) setSubjects((await subjectsRes.json()) as Subject[]);
        }
        load();
    }, []);

    /* Loads other students' booked slots for the visible week only, so this
       student doesn't try to double-book an already-taken time */
    useEffect(() => {
        async function loadBusySlots() {
            const rangeStart = toDateString(weekStart);
            const rangeEndDate = new Date(weekStart);
            rangeEndDate.setDate(weekStart.getDate() + 6);
            const rangeEnd = toDateString(rangeEndDate);

            const response = await apiFetch(`/student/busy-slots?startDate=${rangeStart}&endDate=${rangeEnd}`);
            if (!response.ok) return;
            setBusySlots((await response.json()) as BusySlot[]);
        }
        loadBusySlots();
    }, [weekStart]);

    /* The 7 dates of the currently visible week */
    const weekDates = useMemo(() => {
        return days.map((_, index) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);
            return date;
        });
    }, [weekStart]);

    /* The list of hour numbers currently shown on the grid */
    const hours = useMemo(() => {
        const result: number[] = [];
        for (let hour = hourStart; hour < hourEnd; hour++) result.push(hour);
        return result;
    }, [hourStart, hourEnd]);

    /* Moves the visible week back by 7 days */
    function goToPreviousWeek() {
        setWeekStart((current) => {
            const previous = new Date(current);
            previous.setDate(current.getDate() - 7);
            return previous;
        });
    }

    /* Moves the visible week forward by 7 days */
    function goToNextWeek() {
        setWeekStart((current) => {
            const next = new Date(current);
            next.setDate(current.getDate() + 7);
            return next;
        });
    }

    /* Books the lesson and optimistically adds it to both lessons and busySlots,
       so the cell greys out without waiting for a refetch. Returns an error
       message for the modal to show, or null on success. */
    async function bookLesson(body: {
        subjectId: number;
        date: string;
        startTime: string;
        endTime: string;
    }): Promise<string | null> {
        const response = await apiFetch(`/student/lessons`, {
            method: "POST",
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return await readErrorMessage(response, "Failed to book lesson");
        }

        const created: StudentLesson = await response.json();
        setLessons((current) => [...current, created]);
        setBusySlots((current) => [
            ...current,
            { date: created.date, startTime: created.startTime, endTime: created.endTime },
        ]);
        return null;
    }

    /* Cancels a lesson (soft cancel - status becomes CANCELLED) and removes it
       from the grid and busySlots, since it no longer occupies any time */
    async function cancelLesson(lessonId: number): Promise<boolean> {
        setErrorMessage("");

        const response = await apiFetch(`/lessons/${lessonId}`, { method: "DELETE" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to cancel lesson"));
            return false;
        }

        const cancelled = lessons.find((lesson) => lesson.id === lessonId);
        setLessons((current) => current.filter((lesson) => lesson.id !== lessonId));
        if (cancelled) {
            setBusySlots((current) => current.filter(
                (slot) => !(slot.date === cancelled.date && slot.startTime === cancelled.startTime && slot.endTime === cancelled.endTime)
            ));
        }
        return true;
    }

    return {
        weekDates, hours,
        hourStart, hourEnd, setHourStart, setHourEnd,
        goToPreviousWeek, goToNextWeek,
        scheduleRules, scheduleOverrides, lessons, busySlots, subjects,
        now,
        errorMessage,
        bookLesson, cancelLesson,
    };
}
