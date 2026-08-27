package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.OverrideType;

import java.time.LocalDate;
import java.time.LocalTime;

/* Request to create a one-off change to the teacher's weekly schedule */
public record ScheduleOverrideRequest(LocalDate date, LocalTime startTime, LocalTime endTime, OverrideType type, String note) {
}
