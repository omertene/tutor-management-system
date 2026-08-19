package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

// one row of the "revenue by subject" chart, scoped to a single year+month - lets
// the frontend filter subject breakdown by the same month dropdown used elsewhere
public record SubjectStatsByMonth(int year, int month, String subjectName, long lessonCount, BigDecimal totalRevenue) {
}
