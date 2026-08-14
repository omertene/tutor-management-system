package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;
import java.time.LocalTime;

// a booked time slot with no student-identifying info - used to let a student see
// which times are already taken by other students (grayed out on their schedule view)
// without exposing whose lesson it is
public record BusySlotResponse(
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime
) {
}
