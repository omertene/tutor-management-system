import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Subjects", to: "/teacher/subjects" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
];

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

    const token = localStorage.getItem("token")!;

    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    // month filter - "" means "show all months". stored as "YYYY-M" (e.g. "2026-8")
    // since that's a simple, unique key that also matches how incomeByMonth/
    // completedLessonsByMonth rows are keyed. filtering happens client-side since
    // /teacher/statistics already returns every month in one response
    const [selectedMonth, setSelectedMonth] = useState("");

    // GET /teacher/statistics - one call returns everything on this page
    async function handleLoadStatistics() {
        setErrorMessage("");

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

    useEffect(() => {
        handleLoadStatistics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // every "YYYY-M" that actually has income or lesson data, for the dropdown -
    // built from whatever the backend returned, not a hardcoded list of months
    const availableMonths = statistics
        ? Array.from(new Set([
            ...statistics.incomeByMonth.map((row) => `${row.year}-${row.month}`),
            ...statistics.completedLessonsByMonth.map((row) => `${row.year}-${row.month}`),
        ])).sort().reverse()
        : [];

    const incomeByMonth = statistics
        ? statistics.incomeByMonth
            .filter((row) => !selectedMonth || `${row.year}-${row.month}` === selectedMonth)
            .sort((a, b) => (b.year - a.year) || (b.month - a.month))
        : [];

    const lessonsByMonth = statistics
        ? statistics.completedLessonsByMonth
            .filter((row) => !selectedMonth || `${row.year}-${row.month}` === selectedMonth)
            .sort((a, b) => (b.year - a.year) || (b.month - a.month))
        : [];

    const subjectBreakdown = statistics
        ? [...statistics.subjectBreakdown].sort((a, b) => b.totalRevenue - a.totalRevenue)
        : [];

    const debtsOwed = statistics
        ? statistics.debts.filter((debt) => debt.debt > 0).sort((a, b) => b.debt - a.debt)
        : [];

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const cardClass = "bg-white rounded-xl border border-slate-200 shadow-sm p-6";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold text-slate-900">Statistics</h1>

                    {statistics && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">Month</label>
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={inputClass}>
                                <option value="">All months</option>
                                {availableMonths.map((key) => {
                                    const [year, month] = key.split("-").map(Number);
                                    return (
                                        <option key={key} value={key}>
                                            {monthNames[month - 1]} {year}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {statistics && (
                    <>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">Total income (all time)</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">₪{statistics.totalIncome}</p>
                            </div>
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">Completed lessons (all time)</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">{statistics.totalCompletedLessons}</p>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-3">Income by month</h2>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                    {incomeByMonth.length === 0 && (
                                        <p className="px-4 py-6 text-sm text-slate-500 text-center">No income recorded for this month.</p>
                                    )}
                                    {incomeByMonth.map((row) => (
                                        <div key={`${row.year}-${row.month}`} className="px-4 py-3 flex items-center justify-between">
                                            <span className="text-slate-700">{monthNames[row.month - 1]} {row.year}</span>
                                            <span className="font-medium text-slate-900">₪{row.total}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-3">Completed lessons by month</h2>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                    {lessonsByMonth.length === 0 && (
                                        <p className="px-4 py-6 text-sm text-slate-500 text-center">No completed lessons for this month.</p>
                                    )}
                                    {lessonsByMonth.map((row) => (
                                        <div key={`${row.year}-${row.month}`} className="px-4 py-3 flex items-center justify-between">
                                            <span className="text-slate-700">{monthNames[row.month - 1]} {row.year}</span>
                                            <span className="font-medium text-slate-900">{row.count} lesson{row.count === 1 ? "" : "s"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-lg font-semibold text-slate-900 mb-3">Breakdown by subject</h2>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                {subjectBreakdown.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No completed lessons yet.</p>
                                )}
                                {subjectBreakdown.map((row) => (
                                    <div key={row.subjectName} className="px-4 py-3 flex items-center justify-between">
                                        <span className="font-medium text-slate-900">{row.subjectName}</span>
                                        <span className="text-slate-500 text-sm">{row.lessonCount} lesson{row.lessonCount === 1 ? "" : "s"}</span>
                                        <span className="font-medium text-slate-900">₪{row.totalRevenue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-lg font-semibold text-slate-900 mb-3">Students who owe money</h2>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                {debtsOwed.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No outstanding debts.</p>
                                )}
                                {debtsOwed.map((debt) => (
                                    <div key={debt.studentId} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-medium text-slate-900">{debt.studentFirstName} {debt.studentLastName}</span>
                                        <span className="text-slate-500 text-sm">earned ₪{debt.totalOwed}, paid ₪{debt.totalPaid}</span>
                                        <span className="font-medium text-red-600">owes ₪{debt.debt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default StatisticsPage;
