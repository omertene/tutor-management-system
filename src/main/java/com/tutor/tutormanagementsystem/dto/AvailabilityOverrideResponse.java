package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.OverrideType;

import java.time.LocalDate;
import java.time.LocalTime;

/* One override affecting a day's availability, returned when a student checks open slots */
public record AvailabilityOverrideResponse(LocalDate date, LocalTime startTime,
                                            LocalTime endTime, OverrideType type) {
}
