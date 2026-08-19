package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;
import java.util.List;

// everything the unified statistics dashboard needs in one response. all fields
// except monthlyTrend are scoped to the request's date range (and subject, if one
// was picked); monthlyTrend always covers the trailing 12 months regardless of
// the requested range, per the dashboard's "monthly performance trend" chart spec
public record DashboardStatisticsResponse(
        // KPI row
        BigDecimal totalRevenue,
        BigDecimal incomeReceived,
        long totalLessons,
        double totalHours,
        BigDecimal effectiveHourlyRate,

        // charts
        List<MonthlyTrend> monthlyTrend,
        List<SubjectPerformance> subjectBreakdown,

        // bottom tables
        List<StudentPerformance> topStudents
) {
}
