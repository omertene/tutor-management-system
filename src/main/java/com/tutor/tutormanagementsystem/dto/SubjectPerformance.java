package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

/* One row of the subject summary table / donut chart on the dashboard */
public record SubjectPerformance(
        String subjectName,
        long lessonCount,
        double totalHours,
        BigDecimal totalRevenue,
        BigDecimal averageRatePerHour
) {
}
