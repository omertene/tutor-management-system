package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

// one row of the "breakdown by subject" table
public record SubjectStats(String subjectName, long lessonCount, BigDecimal totalRevenue) {
}
