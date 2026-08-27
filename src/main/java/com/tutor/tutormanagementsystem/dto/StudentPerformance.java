package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

/* One row of the "top students" table on the dashboard */
public record StudentPerformance(Long studentId, String firstName, String lastName, long lessonCount, BigDecimal totalBilled) {
}
