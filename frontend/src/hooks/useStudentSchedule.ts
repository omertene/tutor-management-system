import { useEffect, useMemo, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { AvailabilityWindow, BusySlot, ScheduleRule, StudentLesson, Subject } from "../types/schedule";
import {
    days,
    DEFAULT_HOUR_START, DEFAULT_HOUR_END,
    getStartOfWeek, toDateString,
} from "../utils/time";

// everything the student grid needs from the server, plus the week/hour window it
// is currently showing. the grid component itself is left with rendering only.
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

    // drives the red "now" line; a minute's resolution is all the line needs
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // the student-facing endpoints return date/time/type only - no id, no note
    // (the teacher's private text), see StudentAvailabilityController. a student
    // also only ever sees their own lessons; the backend scopes that by caller id.
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

    // other students' booked slots, shown as blocked/gray so this student doesn't
    // try to double-book a time that's actually already taken. scoped to the visible
    // week only - this endpoint used to return every non-cancelled lesson ever
    // booked, which meant it got slower every time any student booked a lesson,
    // forever, even though the grid only ever shows one week at a time
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

    // books the lesson and optimistically adds it to both the student's own lessons
    // and busySlots, so the cell greys out without waiting for a refetch. returns an
    // error message for the modal to show, or null on success
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

    // cancelling doesn't delete the lesson - it's a soft cancel (status -> CANCELLED),
    // same as everywhere else in the app. it just disappears from the grid since a
    // cancelled lesson no longer occupies any time
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
