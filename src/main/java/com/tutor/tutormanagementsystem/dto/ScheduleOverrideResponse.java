package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.OverrideType;

import java.time.LocalDate;
import java.time.LocalTime;

/* A schedule override as returned to the client */
public record ScheduleOverrideResponse(Long id, LocalDate date, LocalTime startTime,
                                       LocalTime endTime, OverrideType type, String note) {
}
