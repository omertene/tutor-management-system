import { useCallback, useEffect, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { Student } from "../types";

// the student roster: the list itself, the active/inactive counts shown above it, and
// each student's outstanding debt. all three come from separate endpoints and have to
// be refreshed together - deactivating a student changes the list, the counts and
// (because the debt list covers every student) potentially the debt map too.
export function useStudents() {
    const [students, setStudents] = useState<Student[]>([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [showingInactive, setShowingInactive] = useState(false);

    const [activeCount, setActiveCount] = useState(0);
    const [inactiveCount, setInactiveCount] = useState(0);
    const [debtByStudentId, setDebtByStudentId] = useState<Record<number, number>>({});

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

    const loadCounts = useCallback(async () => {
        const response = await apiFetch(`/teacher/students/all`);
        if (!response.ok) return;

        const data: Student[] = await response.json();
        setActiveCount(data.filter((student) => student.active).length);
        setInactiveCount(data.filter((student) => !student.active).length);
    }, []);

    // re-reads whichever list is currently on screen, plus the counts and debts
    const refresh = useCallback(async () => {
        await Promise.all([loadStudents(showingInactive), loadDebts(), loadCounts()]);
    }, [loadStudents, loadDebts, loadCounts, showingInactive]);

    useEffect(() => {
        loadStudents(false);
        loadDebts();
        loadCounts();
    }, [loadStudents, loadDebts, loadCounts]);

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

    // replaces one row in place after an edit, so the list doesn't have to be re-fetched
    function replaceStudent(updated: Student) {
        setStudents((current) => current.map((student) => (student.id === updated.id ? updated : student)));
    }

    return {
        students, errorMessage, setErrorMessage, showingInactive,
        activeCount, inactiveCount, debtByStudentId,
        loadStudents, refresh, toggleActive, replaceStudent,
    };
}
