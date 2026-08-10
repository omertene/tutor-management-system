import { useState } from "react";
import LogoutButton from "../components/LogoutButton";

const API_BASE_URL = "http://localhost:8080";

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type MonthlyAmount = {
    year: number;
    month: number;
    total: number;
};

type MonthlyCount = {
    year: number;
    month: number;
    count: number;
};

type SubjectStats = {
    subjectName: string;
    lessonCount: number;
    totalRevenue: number;
};

type Debt = {
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    totalOwed: number;
    totalPaid: number;
    debt: number;
};

type Statistics = {
    totalIncome: number;
    incomeByMonth: MonthlyAmount[];
    totalCompletedLessons: number;
    completedLessonsByMonth: MonthlyCount[];
    subjectBreakdown: SubjectStats[];
    debts: Debt[];
};

function StatisticsPage() {

    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    // month filter - "" means "show all months" (the original behavior).
    // selectedMonth is stored as "YYYY-M" (e.g. "2026-8") since that's a simple,
    // unique key that also matches how incomeByMonth/completedLessonsByMonth rows
    // are keyed. filtering happens client-side since /teacher/statistics already
    // returns every month in one response - no need for a second backend call
    const [selectedMonth, setSelectedMonth] = useState("");

    // GET /teacher/statistics - one call returns everything on this page
    async function handleLoadStatistics() {
        setErrorMessage("");

        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teacher/statistics`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load statistics");
            return;
        }

        const data = await response.json();
        setStatistics(data);
    }

    // every "YYYY-M" that actually has income or lesson data, for the dropdown -
    // built from whatever the backend returned, not a hardcoded list of months
    const availableMonths = statistics
        ? Array.from(new Set([
            ...statistics.incomeByMonth.map((row) => `${row.year}-${row.month}`),
            ...statistics.completedLessonsByMonth.map((row) => `${row.year}-${row.month}`),
        ])).sort()
        : [];

    const incomeByMonth = statistics
        ? statistics.incomeByMonth.filter((row) => !selectedMonth || `${row.year}-${row.month}` === selectedMonth)
        : [];

    const lessonsByMonth = statistics
        ? statistics.completedLessonsByMonth.filter((row) => !selectedMonth || `${row.year}-${row.month}` === selectedMonth)
        : [];

    return (
        <div>
            <h1>Statistics</h1>

            <button onClick={handleLoadStatistics}>load statistics</button>

            {errorMessage && <p>{errorMessage}</p>}

            {statistics && (
                <>
                    <h2>Filter by month</h2>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                        <option value="">all months</option>
                        {availableMonths.map((key) => {
                            const [year, month] = key.split("-").map(Number);
                            return (
                                <option key={key} value={key}>
                                    {monthNames[month - 1]} {year}
                                </option>
                            );
                        })}
                    </select>

                    <h2>Income</h2>
                    <p>Total income (all time): ₪{statistics.totalIncome}</p>
                    <ul>
                        {incomeByMonth.map((row) => (
                            <li key={`${row.year}-${row.month}`}>
                                {monthNames[row.month - 1]} {row.year} — ₪{row.total}
                            </li>
                        ))}
                        {selectedMonth && incomeByMonth.length === 0 && (
                            <li>No income recorded for this month</li>
                        )}
                    </ul>

                    <h2>Lessons</h2>
                    <p>Total completed lessons (all time): {statistics.totalCompletedLessons}</p>
                    <ul>
                        {lessonsByMonth.map((row) => (
                            <li key={`${row.year}-${row.month}`}>
                                {monthNames[row.month - 1]} {row.year} — {row.count} lesson(s)
                            </li>
                        ))}
                        {selectedMonth && lessonsByMonth.length === 0 && (
                            <li>No completed lessons for this month</li>
                        )}
                    </ul>

                    <h2>Breakdown by subject</h2>
                    <ul>
                        {statistics.subjectBreakdown.map((row) => (
                            <li key={row.subjectName}>
                                {row.subjectName} — {row.lessonCount} lesson(s) — ₪{row.totalRevenue}
                            </li>
                        ))}
                    </ul>

                    <h2>Students who owe money</h2>
                    <ul>
                        {statistics.debts
                            .filter((debt) => debt.debt > 0)
                            .map((debt) => (
                                <li key={debt.studentId}>
                                    {debt.studentFirstName} {debt.studentLastName} — owes ₪{debt.debt}
                                    {" "}(earned ₪{debt.totalOwed}, paid ₪{debt.totalPaid})
                                </li>
                            ))}
                    </ul>
                </>
            )}

            <br />
            <LogoutButton />
        </div>
    );
}

export default StatisticsPage;
