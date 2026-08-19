package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

// one row of the subject summary table / donut chart, scoped to the dashboard's
// selected time range
public record SubjectPerformance(
        String subjectName,
        long lessonCount,
        double totalHours,
        BigDecimal totalRevenue,
        BigDecimal averageRatePerHour
) {
}
