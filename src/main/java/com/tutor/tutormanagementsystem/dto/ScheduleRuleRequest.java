package com.tutor.tutormanagementsystem.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record ScheduleRuleRequest(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
}
