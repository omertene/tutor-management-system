package com.tutor.tutormanagementsystem.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

/* Request to create/update a recurring weekly availability rule */
public record ScheduleRuleRequest(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
}
