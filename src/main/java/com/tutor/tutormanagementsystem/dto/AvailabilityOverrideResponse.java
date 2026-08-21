package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.OverrideType;

import java.time.LocalDate;
import java.time.LocalTime;

public record AvailabilityOverrideResponse(LocalDate date, LocalTime startTime,
                                            LocalTime endTime, OverrideType type) {
}
