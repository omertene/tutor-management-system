import { useEffect, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { Student, Subject } from "../types";
import type { Lesson } from "../types/lesson";
import { STUDENT_MIN_CANCEL_NOTICE_HOURS } from "../types/lesson";

// lessons for whichever role is viewing, plus the reference data the teacher's
// booking form needs. the teacher sees every lesson; a student sees only their
// own, from a different endpoint.
export function useLessons(role: string) {
    const isTeacher = role === "TEACHER";

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function load() {
            const lessonsRes = await apiFetch(isTeacher ? `/teacher/lessons` : `/student/lessons`);
            if (lessonsRes.ok) setLessons((await lessonsRes.json()) as Lesson[]);
            else setErrorMessage("Failed to load lessons");

            const subjectsRes = await apiFetch(`/subjects`);
            if (subjectsRes.ok) setSubjects((await subjectsRes.json()) as Subject[]);
            else setErrorMessage("Failed to load subjects");

            if (isTeacher) {
                const studentsRes = await apiFetch(`/teacher/students`);
                if (studentsRes.ok) setStudents((await studentsRes.json()) as Student[]);
                else setErrorMessage("Failed to load students");
            }
        }
        load();
    }, [isTeacher]);

    // teacher books a lesson on behalf of a chosen student - POST /teacher/lessons.
    // returns false so the caller can tell a rejected booking from a successful one
    async function createLesson(body: {
        studentId: number;
        subjectId: number;
        date: string;
        startTime: string;
        endTime: string;
    }): Promise<boolean> {
        setErrorMessage("");

        const response = await apiFetch(`/teacher/lessons`, {
            method: "POST",
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to create lesson"));
            return false;
        }

        const created: Lesson = await response.json();
        setLessons((current) => [...current, created]);
        return true;
    }

    // teacher types a brand new subject name straight from the booking dropdown -
    // POST /subjects, then hands the created subject back so booking can continue
    // without a page navigation
    async function createSubject(name: string): Promise<Subject | null> {
        setErrorMessage("");

        const response = await apiFetch(`/subjects`, {
            method: "POST",
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to add subject"));
            return null;
        }

        const created: Subject = await response.json();
        setSubjects((current) => [...current, created]);
        return created;
    }

    // a lesson can only be cancelled while SCHEDULED or (teacher-only) COMPLETED -
    // mirrors the backend rule in LessonService.cancelLesson, used to decide whether
    // to show the Cancel button at all
    function canCancelLesson(lesson: Lesson): boolean {
        if (lesson.status === "SCHEDULED") {
            if (!isTeacher) {
                const lessonStart = new Date(`${lesson.date}T${lesson.startTime}`);
                const minCancelTime = new Date();
                minCancelTime.setHours(minCancelTime.getHours() + STUDENT_MIN_CANCEL_NOTICE_HOURS);
                if (lessonStart < minCancelTime) return false;
            }
            return true;
        }
        if (lesson.status === "COMPLETED") return isTeacher;
        return false;
    }

    async function cancelLesson(lesson: Lesson) {
        setErrorMessage("");

        // cancelling a COMPLETED lesson reverses real revenue/debt, so it confirms first
        if (lesson.status === "COMPLETED") {
            const confirmed = window.confirm(
                "Cancel this completed lesson? This will reverse its effect on debt and revenue."
            );
            if (!confirmed) return;
        }

        const response = await apiFetch(`/lessons/${lesson.id}`, { method: "DELETE" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to cancel lesson"));
            return;
        }

        const cancelled: Lesson = await response.json();
        setLessons((current) => current.map((l) => (l.id === lesson.id ? cancelled : l)));
    }

    // teacher marks a lesson as completed, so it counts toward the student's debt -
    // PATCH /teacher/lessons/{id}/complete
    async function completeLesson(lessonId: number) {
        setErrorMessage("");

        const response = await apiFetch(`/teacher/lessons/${lessonId}/complete`, { method: "PATCH" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to complete lesson"));
            return;
        }

        const completed: Lesson = await response.json();
        setLessons((current) => current.map((l) => (l.id === lessonId ? completed : l)));
    }

    return {
        lessons, subjects, students,
        errorMessage, setErrorMessage,
        createLesson, createSubject,
        canCancelLesson, cancelLesson, completeLesson,
    };
}
