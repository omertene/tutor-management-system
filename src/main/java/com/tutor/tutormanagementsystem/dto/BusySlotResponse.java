package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/* A taken time slot with no student info - just so a student can see which
   times are already booked without seeing whose lesson it is */
public record BusySlotResponse(
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime
) {
}
