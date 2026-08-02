package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record StudentLessonRequest(Long subjectId, LocalDate date, LocalTime startTime, LocalTime endTime) {
}
