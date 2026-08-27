package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;
import java.util.List;

/* Everything the statistics dashboard needs in one response - KPIs plus the
   chart/table data */
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
