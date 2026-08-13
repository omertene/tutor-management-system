package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.LessonStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record LessonResponse(Long id, Long studentId, String studentFirstName, String studentLastName, String subjectName, LocalDate date,
                             LocalTime startTime, LocalTime endTime, LessonStatus status, Long subjectId, BigDecimal priceAtBooking,
                             String notes) {
}
