import NavBar from "../components/NavBar";
import StatisticsCharts from "../components/statistics/StatisticsCharts";
import StatisticsTables from "../components/statistics/StatisticsTables";
import { useStatistics } from "../hooks/useStatistics";
import { cardClass, inputClass } from "../constants/formStyles";
import { formatHours, monthNames } from "../utils/time";
import { teacherLinks } from "../constants/navLinks";
import type { RangeType } from "../types/statistics";

function StatisticsPage() {
    const {
        statistics, subjects, years, errorMessage,
        rangeType, setRangeType,
        selectedYear, setSelectedYear,
        selectedMonth, setSelectedMonth,
        subjectId, setSubjectId,
    } = useStatistics();

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
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">Effective Hourly Rate</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">₪{statistics.effectiveHourlyRate}</p>
                                <p className="text-xs text-slate-400 mt-1">Revenue divided by hours taught</p>
                            </div>
                        </div>

                        <StatisticsCharts
                            monthlyTrend={statistics.monthlyTrend}
                            subjectBreakdown={statistics.subjectBreakdown}
                            subjectFilterActive={subjectId !== ""}
                        />

                        <StatisticsTables
                            subjectBreakdown={statistics.subjectBreakdown}
                            topStudents={statistics.topStudents}
                        />
                    </>
                )}
            </main>
        </div>
    );
}

export default StatisticsPage;
