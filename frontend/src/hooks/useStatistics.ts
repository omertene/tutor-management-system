import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";
import type { Subject } from "../types";
import type { DashboardStatistics, RangeType } from "../types/statistics";
import { toDateString } from "../utils/time";

/* Resolves the range type (and picked year/month) into concrete start/end
   dates the backend can query with. "All time" just uses a wide-open window
   instead of looking up the earliest lesson. */
function resolveRange(rangeType: RangeType, year: number, month: number): { startDate: string; endDate: string } {
    if (rangeType === "month") {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        return { startDate: toDateString(start), endDate: toDateString(end) };
    }

    if (rangeType === "year") {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        return { startDate: toDateString(start), endDate: toDateString(end) };
    }

    /* allTime - end date is intentionally far in the future rather than "today",
       since a lesson or payment dated ahead would otherwise fall outside "all time" */
    const today = new Date();
    return { startDate: "2000-01-01", endDate: toDateString(new Date(today.getFullYear() + 10, 11, 31)) };
}

/* All the data-fetching and filter state behind the statistics dashboard - the
   page just reads these values and renders */
export function useStatistics() {
    const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [years, setYears] = useState<number[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [rangeType, setRangeType] = useState<RangeType>("month");
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [subjectId, setSubjectId] = useState("");

    const { startDate, endDate } = useMemo(
        () => resolveRange(rangeType, selectedYear ?? new Date().getFullYear(), selectedMonth),
        [rangeType, selectedYear, selectedMonth]
    );

    /* Loads subjects (for the filter dropdown) and the years with data (for the
       year picker) once on mount */
    useEffect(() => {
        async function loadSubjects() {
            try {
                const response = await apiFetch(`/subjects`);
                if (!response.ok) return;
                const data: Subject[] = await response.json();
                setSubjects(data);
            } catch {
                /* Subject filter is a non-essential enhancement - fail quietly and
                   just leave the dropdown showing "All subjects" */
            }
        }

        /* Years that actually have completed lessons - populates the year picker
           and defaults the selection to the most recent year with data, falling
           back to this year if there's no data yet */
        async function loadYears() {
            try {
                const response = await apiFetch(`/teacher/statistics/years`);
                if (!response.ok) return;
                const data: number[] = await response.json();
                setYears(data);
                setSelectedYear(data.length > 0 ? data[0] : new Date().getFullYear());
            } catch {
                setSelectedYear(new Date().getFullYear());
            }
        }

        loadSubjects();
        loadYears();
    }, []);

    /* Reloads the statistics whenever the date range or subject filter changes */
    useEffect(() => {
        /* Waits for the year picker to finish loading, so Month/Year mode don't
           briefly query with the wrong (default) year */
        if (selectedYear === null) return;

        async function loadStatistics() {
            setErrorMessage("");
            try {
                const params = new URLSearchParams({ startDate, endDate });
                if (subjectId) params.set("subjectId", subjectId);

                const response = await apiFetch(`/teacher/statistics/dashboard?${params.toString()}`);

                if (!response.ok) {
                    setErrorMessage("Failed to load statistics");
                    return;
                }

                const data: DashboardStatistics = await response.json();
                setStatistics(data);
            } catch {
                setErrorMessage("Could not reach the server. Please try again.");
            }
        }

        loadStatistics();
    }, [startDate, endDate, subjectId, selectedYear]);

    return {
        statistics, subjects, years, errorMessage,
        rangeType, setRangeType,
        selectedYear, setSelectedYear,
        selectedMonth, setSelectedMonth,
        subjectId, setSubjectId,
    };
}
