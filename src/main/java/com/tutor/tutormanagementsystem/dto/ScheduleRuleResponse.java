package com.tutor.tutormanagementsystem.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

/* A recurring weekly availability rule as returned to the client */
public record ScheduleRuleResponse(Long id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
}
