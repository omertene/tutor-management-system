package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

// one row of the "top students" table, scoped to the dashboard's selected time
// range - billed = sum of priceAtBooking for that student's completed lessons in
// range (what they were charged, not what they've paid - payments aren't tied to
// a subject/lesson so "billed" is the only figure that can be scoped to a range)
public record StudentPerformance(Long studentId, String firstName, String lastName, long lessonCount, BigDecimal totalBilled) {
}
