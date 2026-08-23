import { useEffect, useMemo, useState } from "react";
import NavBar from "../components/NavBar";
import { API_BASE_URL, getToken } from "../utils/api";
import type { Subject } from "../types";
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
    { label: "Settings", to: "/teacher/settings" },
];

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COLORS = {
    indigo: "#4f46e5",
    sky: "#0ea5e9",
    slate: "#64748b",
};
const PIE_COLORS = ["#4f46e5", "#0ea5e9", "#16a34a", "#d97706", "#dc2626", "#a855f7", "#64748b", "#0891b2"];

type MonthlyTrend = {
    year: number;
    month: number;
    revenue: number;
    incomeReceived: number;
    hours: number;
};

type SubjectPerformance = {
    subjectName: string;
    lessonCount: number;
    totalHours: number;
    totalRevenue: number;
};

type StudentPerformance = {
    studentId: number;
    firstName: string;
    lastName: string;
    lessonCount: number;
    totalBilled: number;
};

type DashboardStatistics = {
    totalRevenue: number;
    incomeReceived: number;
    totalLessons: number;
    totalHours: number;
    monthlyTrend: MonthlyTrend[];
    subjectBreakdown: SubjectPerformance[];
    topStudents: StudentPerformance[];
};

type RangeType = "month" | "year" | "allTime";

function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// resolves the range type (+ picked year/month, where relevant) into concrete
// start/end dates the backend can query with. "All time" uses a wide-open
// window rather than looking up the earliest lesson, which is simpler and has
// no real downside
function resolveRange(rangeType: RangeType, year: number, month: number): { startDate: string; endDate: string } {
    if (rangeType === "month") {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    }

    if (rangeType === "year") {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    }

    // allTime
    const today = new Date();
    return { startDate: "2000-01-01", endDate: toIsoDate(new Date(today.getFullYear() + 1, 0, 0)) };
}

function formatHours(hours: number): string {
    return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

function monthLabel(year: number, month: number): string {
    return `${monthNames[month - 1]} '${String(year).slice(2)}`;
}

// static tooltip box (no cursor-following label) shared by every chart on this page
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; unit?: string }[]; label?: string }) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-sm">
            {label && <p className="text-slate-500 mb-1">{label}</p>}
            {payload.map((entry) => (
                <p key={entry.name} className="font-medium" style={{ color: entry.color }}>
                    {entry.name}: {entry.value}{entry.unit ?? ""}
                </p>
            ))}
        </div>
    );
}

function StatisticsPage() {
    const token = getToken();

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

    async function handleLoadSubjects() {
        try {
            const response = await fetch(`${API_BASE_URL}/subjects`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return;
            const data: Subject[] = await response.json();
            setSubjects(data);
        } catch {
            // subject filter is a non-essential enhancement - fail quietly and
            // just leave the dropdown showing "All subjects"
        }
    }

    // years that actually have completed lessons - populates the year picker (used
    // directly in Year mode, and alongside a month in Month mode) and defaults the
    // selection to the most recent year with data, falling back to this year if
    // there's no data at all yet
    async function handleLoadYears() {
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/statistics/years`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return;
            const data: number[] = await response.json();
            setYears(data);
            setSelectedYear(data.length > 0 ? data[0] : new Date().getFullYear());
        } catch {
            setSelectedYear(new Date().getFullYear());
        }
    }

    async function handleLoadStatistics() {
        setErrorMessage("");

        try {
            const params = new URLSearchParams({ startDate, endDate });
            if (subjectId) params.set("subjectId", subjectId);

            const response = await fetch(`${API_BASE_URL}/teacher/statistics/dashboard?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

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

    useEffect(() => {
        handleLoadSubjects();
        handleLoadYears();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // wait for the year picker to finish loading before querying, so Month/Year
        // mode don't briefly query with the wrong (default) year
        if (selectedYear === null) return;
        handleLoadStatistics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, subjectId, selectedYear]);

    const trendChartData = (statistics?.monthlyTrend ?? []).map((row) => ({
        label: monthLabel(row.year, row.month),
        Revenue: row.revenue,
        "Income received": row.incomeReceived,
        Hours: row.hours,
    }));

    const subjectChartData = (statistics?.subjectBreakdown ?? []).map((row) => ({
        name: row.subjectName,
        value: row.totalRevenue,
    }));

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const cardClass = "bg-white rounded-xl border border-slate-200 shadow-sm p-6";
    const sectionTitleClass = "text-lg font-semibold text-slate-900 mb-3";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold text-slate-900">Statistics</h1>

                    <div className="flex flex-wrap items-center gap-2">
                        <select value={rangeType} onChange={(e) => setRangeType(e.target.value as RangeType)} className={inputClass}>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                            <option value="allTime">All Time</option>
                        </select>

                        {rangeType === "month" && (
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className={inputClass}>
                                {monthNames.map((name, index) => (
                                    <option key={name} value={index + 1}>{name}</option>
                                ))}
                            </select>
                        )}

                        {(rangeType === "month" || rangeType === "year") && (
                            <select value={selectedYear ?? ""} onChange={(e) => setSelectedYear(Number(e.target.value))} className={inputClass}>
                                {years.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
                                {years.map((yr) => (
                                    <option key={yr} value={yr}>{yr}</option>
                                ))}
                            </select>
                        )}

                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputClass}>
                            <option value="">All subjects</option>
                            {subjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {statistics && (
                    <>
                        {/* KPI row */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">Total Revenue</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">₪{statistics.totalRevenue}</p>
                                <p className="text-xs text-slate-400 mt-1">Earned from completed lessons</p>
                            </div>
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">Income Received</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">₪{statistics.incomeReceived}</p>
                                <p className="text-xs text-slate-400 mt-1">Actually paid in</p>
                            </div>
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">Hours &amp; Lessons</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">
                                    {formatHours(statistics.totalHours)} <span className="text-lg font-normal text-slate-400">hrs</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">{statistics.totalLessons} lesson{statistics.totalLessons === 1 ? "" : "s"}</p>
                            </div>
                        </div>

                        {/* charts */}
                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h2 className={sectionTitleClass}>Monthly performance (last 12 months)</h2>
                                <div className={cardClass}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <ComposedChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.slate }} />
                                            <YAxis yAxisId="money" tick={{ fontSize: 12, fill: COLORS.slate }} />
                                            <YAxis yAxisId="hours" orientation="right" tick={{ fontSize: 12, fill: COLORS.slate }} />
                                            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Bar yAxisId="money" dataKey="Revenue" fill={COLORS.indigo} radius={[3, 3, 0, 0]} />
                                            <Bar yAxisId="money" dataKey="Income received" fill={COLORS.sky} radius={[3, 3, 0, 0]} />
                                            <Line yAxisId="hours" type="monotone" dataKey="Hours" stroke={COLORS.slate} strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div>
                                <h2 className={sectionTitleClass}>Revenue by subject</h2>
                                <div className={cardClass}>
                                    {subjectChartData.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-24">No completed lessons in this range.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={subjectChartData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                                                    labelLine={false}
                                                >
                                                    {subjectChartData.map((_, index) => (
                                                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<ChartTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* bottom tables */}
                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h2 className={sectionTitleClass}>Subject summary</h2>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-left">
                                                <th className="px-4 py-2 font-medium">Subject</th>
                                                <th className="px-4 py-2 font-medium text-right">Lessons</th>
                                                <th className="px-4 py-2 font-medium text-right">Hours</th>
                                                <th className="px-4 py-2 font-medium text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {statistics.subjectBreakdown.length === 0 && (
                                                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No completed lessons in this range.</td></tr>
                                            )}
                                            {statistics.subjectBreakdown.map((row) => (
                                                <tr key={row.subjectName}>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{row.subjectName}</td>
                                                    <td className="px-4 py-3 text-right text-slate-700">{row.lessonCount}</td>
                                                    <td className="px-4 py-3 text-right text-slate-700">{formatHours(row.totalHours)}</td>
                                                    <td className="px-4 py-3 text-right text-slate-900 font-medium">₪{row.totalRevenue}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h2 className={sectionTitleClass}>Top students</h2>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-left">
                                                <th className="px-4 py-2 font-medium">Student</th>
                                                <th className="px-4 py-2 font-medium text-right">Lessons</th>
                                                <th className="px-4 py-2 font-medium text-right">Total Billed</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {statistics.topStudents.length === 0 && (
                                                <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">No completed lessons in this range.</td></tr>
                                            )}
                                            {statistics.topStudents.map((row) => (
                                                <tr key={row.studentId}>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{row.firstName} {row.lastName}</td>
                                                    <td className="px-4 py-3 text-right text-slate-700">{row.lessonCount}</td>
                                                    <td className="px-4 py-3 text-right text-slate-900 font-medium">₪{row.totalBilled}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default StatisticsPage;
