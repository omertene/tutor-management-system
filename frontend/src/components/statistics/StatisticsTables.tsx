import { formatMoney } from "../../utils/money";
import { formatHours } from "../../utils/time";
import type { SubjectPerformance, StudentPerformance } from "../../types/statistics";

/* The two tables on the statistics page: subject summary and top students. */

const sectionTitleClass = "text-lg font-semibold text-slate-900 mb-3";
const tableWrapClass = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden";
const headRowClass = "bg-slate-50 text-slate-500 text-start";
const thClass = "px-4 py-2 font-medium";
const thNumClass = "px-4 py-2 font-medium text-end";

type StatisticsTablesProps = {
    subjectBreakdown: SubjectPerformance[];
    topStudents: StudentPerformance[];
};

/* Two plain tables, no local state - just formats and lists the rows it's given */
export default function StatisticsTables({ subjectBreakdown, topStudents }: StatisticsTablesProps) {
    return (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h2 className={sectionTitleClass}>סיכום לפי מקצוע</h2>
                <div className={tableWrapClass}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={headRowClass}>
                                <th className={thClass}>מקצוע</th>
                                <th className={thNumClass}>שיעורים</th>
                                <th className={thNumClass}>שעות</th>
                                <th className={thNumClass}>הכנסות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {subjectBreakdown.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">אין שיעורים שהושלמו בטווח הזה.</td></tr>
                            )}
                            {subjectBreakdown.map((row) => (
                                <tr key={row.subjectName}>
                                    <td className="px-4 py-3 font-medium text-slate-900">{row.subjectName}</td>
                                    <td className="px-4 py-3 text-end text-slate-700">{row.lessonCount}</td>
                                    <td className="px-4 py-3 text-end text-slate-700">{formatHours(row.totalHours)}</td>
                                    <td className="px-4 py-3 text-end text-slate-900 font-medium">{formatMoney(row.totalRevenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h2 className={sectionTitleClass}>תלמידים מובילים</h2>
                <div className={tableWrapClass}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={headRowClass}>
                                <th className={thClass}>תלמיד</th>
                                <th className={thNumClass}>שיעורים</th>
                                <th className={thNumClass}>סך חיוב</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topStudents.length === 0 && (
                                <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">אין שיעורים שהושלמו בטווח הזה.</td></tr>
                            )}
                            {topStudents.slice(0, 5).map((row) => (
                                <tr key={row.studentId}>
                                    <td className="px-4 py-3 font-medium text-slate-900">{row.firstName} {row.lastName}</td>
                                    <td className="px-4 py-3 text-end text-slate-700">{row.lessonCount}</td>
                                    <td className="px-4 py-3 text-end text-slate-900 font-medium">{formatMoney(row.totalBilled)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
