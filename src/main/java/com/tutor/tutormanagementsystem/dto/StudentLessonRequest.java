package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/* Request for a student to book a lesson for themselves */
public record StudentLessonRequest(Long subjectId, LocalDate date, LocalTime startTime, LocalTime endTime) {
}
