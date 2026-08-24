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
import { cardClass } from "../../constants/formStyles";
import { monthNames } from "../../utils/time";
import type { MonthlyTrend, SubjectPerformance } from "../../types/statistics";

const COLORS = {
    indigo: "#4f46e5",
    sky: "#0ea5e9",
    slate: "#64748b",
};
const PIE_COLORS = ["#4f46e5", "#0ea5e9", "#16a34a", "#d97706", "#dc2626", "#a855f7", "#64748b", "#0891b2"];

const sectionTitleClass = "text-lg font-semibold text-slate-900 mb-3";

function monthLabel(year: number, month: number): string {
    return `${monthNames[month - 1]} '${String(year).slice(2)}`;
}

// static tooltip box (no cursor-following label) shared by both charts
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

type StatisticsChartsProps = {
    monthlyTrend: MonthlyTrend[];
    subjectBreakdown: SubjectPerformance[];
    // set when a single subject is selected - the trend chart needs it to warn that
    // its revenue series is filtered while the income series isn't
    subjectFilterActive: boolean;
};

export default function StatisticsCharts({ monthlyTrend, subjectBreakdown, subjectFilterActive }: StatisticsChartsProps) {
    const trendChartData = monthlyTrend.map((row) => ({
        label: monthLabel(row.year, row.month),
        Revenue: row.revenue,
        "Income received": row.incomeReceived,
        Hours: row.hours,
    }));

    const subjectChartData = subjectBreakdown.map((row) => ({
        name: row.subjectName,
        value: row.totalRevenue,
    }));

    return (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h2 className={sectionTitleClass}>Monthly performance (last 12 months)</h2>
                {subjectFilterActive && (
                    <p className="text-xs text-slate-400 -mt-2 mb-3">
                        Revenue is filtered to the selected subject; income received always covers every subject.
                    </p>
                )}
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
    );
}
