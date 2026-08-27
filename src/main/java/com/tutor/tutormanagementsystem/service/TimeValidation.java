package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;

import java.time.LocalTime;

/* Utility class for validating time ranges and enforcing 15-minute slot boundary increments */

public final class TimeValidation {

    private TimeValidation() {
    }

    /* Enforces that start time precedes end time and both adhere to 15-minute intervals */
    public static void requireValidRange(LocalTime startTime, LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new InvalidTimeRangeException("Start time must be before end time");
        }

        if (!isOnQuarterHour(startTime) || !isOnQuarterHour(endTime)) {
            throw new InvalidTimeRangeException("Times must be on a 15-minute increment (e.g. 07:00, 07:15, 07:30, 07:45)");
        }
    }

    /* Validates that a time boundary falls precisely on a quarter-hour increment with zero seconds/nanos */
    private static boolean isOnQuarterHour(LocalTime time) {
        return time.getMinute() % 15 == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }
}
