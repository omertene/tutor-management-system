import { useCallback, useEffect, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { Student } from "../types";

/* The student roster: the list, the active/inactive counts above it, and each
   student's outstanding debt. All three come from separate endpoints and get
   refreshed together, since one change (e.g. deactivating a student) can
   affect the list, the counts, and the debt map at once. */
export function useStudents() {
    const [students, setStudents] = useState<Student[]>([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [showingInactive, setShowingInactive] = useState(false);

    const [activeCount, setActiveCount] = useState(0);
    const [inactiveCount, setInactiveCount] = useState(0);
    const [debtByStudentId, setDebtByStudentId] = useState<Record<number, number>>({});

    /* Loads either the active roster or the full list filtered to inactive students */
    const loadStudents = useCallback(async (inactiveOnly: boolean) => {
        setErrorMessage("");
        setShowingInactive(inactiveOnly);

        const response = await apiFetch(inactiveOnly ? `/teacher/students/all` : `/teacher/students`);
        if (!response.ok) {
            setErrorMessage("Failed to load students");
            return;
        }

        const data: Student[] = await response.json();
        setStudents(inactiveOnly ? data.filter((student) => !student.active) : data);
    }, []);

    /* Loads every student's debt into a lookup map by id */
    const loadDebts = useCallback(async () => {
        const response = await apiFetch(`/teacher/debts`);
        if (!response.ok) return;

        const data: { studentId: number; debt: number }[] = await response.json();
        const map: Record<number, number> = {};
        data.forEach((entry) => {
            map[entry.studentId] = entry.debt;
        });
        setDebtByStudentId(map);
    }, []);

    /* Loads the active/inactive counts shown above the roster */
    const loadCounts = useCallback(async () => {
        const response = await apiFetch(`/teacher/students/all`);
        if (!response.ok) return;

        const data: Student[] = await response.json();
        setActiveCount(data.filter((student) => student.active).length);
        setInactiveCount(data.filter((student) => !student.active).length);
    }, []);

    /* Re-reads whichever list is currently on screen, plus the counts and debts */
    const refresh = useCallback(async () => {
        await Promise.all([loadStudents(showingInactive), loadDebts(), loadCounts()]);
    }, [loadStudents, loadDebts, loadCounts, showingInactive]);

    /* Loads the active roster, counts, and debts once on mount */
    useEffect(() => {
        loadStudents(false);
        loadDebts();
        loadCounts();
    }, [loadStudents, loadDebts, loadCounts]);

    /* Activates or deactivates a student, then refreshes everything */
    async function toggleActive(student: Student) {
        setErrorMessage("");
        try {
            const response = await apiFetch(`/teacher/students/${student.id}/active`, {
                method: "PATCH",
                body: JSON.stringify({ active: !student.active }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "Failed to update student status"));
                return;
            }

            refresh();
        } catch {
            setErrorMessage("Could not reach the server. Please try again.");
        }
    }

    /* Replaces one row in place after an edit, so the list doesn't need refetching */
    function replaceStudent(updated: Student) {
        setStudents((current) => current.map((student) => (student.id === updated.id ? updated : student)));
    }

    return {
        students, errorMessage, setErrorMessage, showingInactive,
        activeCount, inactiveCount, debtByStudentId,
        loadStudents, refresh, toggleActive, replaceStudent,
    };
}
