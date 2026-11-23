import { formatMoney } from "../utils/money";
import NavBar from "../components/NavBar";
import StatisticsCharts from "../components/statistics/StatisticsCharts";
import StatisticsTables from "../components/statistics/StatisticsTables";
import { useStatistics } from "../hooks/useStatistics";
import { cardClass, inputClass } from "../constants/formStyles";
import { formatHours, monthNames } from "../utils/time";
import { teacherLinks } from "../constants/navLinks";
import type { RangeType } from "../types/statistics";

/* The teacher's statistics dashboard: range/subject filters, KPI cards, charts,
   and summary tables */
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
                    <h1 className="text-2xl font-semibold text-slate-900">סטטיסטיקה</h1>

                    <div className="flex flex-wrap items-center gap-2">
                        <select value={rangeType} onChange={(e) => setRangeType(e.target.value as RangeType)} className={inputClass}>
                            <option value="month">חודש</option>
                            <option value="year">שנה</option>
                            <option value="allTime">כל הזמן</option>
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
                            <option value="">כל המקצועות</option>
                            {subjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {statistics && (
                    <>
                        {/* the four KPI cards */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">סך הכנסות</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">{formatMoney(statistics.totalRevenue)}</p>
                                <p className="text-xs text-slate-400 mt-1">הכנסה משיעורים שהושלמו</p>
                            </div>
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">הכנסה שהתקבלה</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">{formatMoney(statistics.incomeReceived)}</p>
                                <p className="text-xs text-slate-400 mt-1">סכומים ששולמו בפועל</p>
                            </div>
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">שעות ושיעורים</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">
                                    {formatHours(statistics.totalHours)} <span className="text-lg font-normal text-slate-400">שעות</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">{statistics.totalLessons === 1 ? "שיעור אחד" : `${statistics.totalLessons} שיעורים`}</p>
                            </div>
                            <div className={cardClass}>
                                <p className="text-sm text-slate-500">מחיר ממוצע לשעה</p>
                                <p className="text-3xl font-semibold text-slate-900 mt-1">{formatMoney(statistics.effectiveHourlyRate)}</p>
                                <p className="text-xs text-slate-400 mt-1">הכנסות חלקי שעות הוראה</p>
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
