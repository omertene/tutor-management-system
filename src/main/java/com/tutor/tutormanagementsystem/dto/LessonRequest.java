package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record LessonRequest(Long studentId, Long subjectId, LocalDate date, LocalTime startTime, LocalTime endTime) {
}
