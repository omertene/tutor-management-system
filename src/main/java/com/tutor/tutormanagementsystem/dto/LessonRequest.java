package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/* Request to book a lesson for a student - used by the teacher's booking endpoint */
public record LessonRequest(Long studentId, Long subjectId, LocalDate date, LocalTime startTime, LocalTime endTime) {
}
