package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;

import java.time.LocalTime;


public final class TimeValidation {

    private TimeValidation() {
    }

    public static void requireValidRange(LocalTime startTime, LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new InvalidTimeRangeException("Start time must be before end time");
        }

        if (!isOnQuarterHour(startTime) || !isOnQuarterHour(endTime)) {
            throw new InvalidTimeRangeException("Times must be on a 15-minute increment (e.g. 07:00, 07:15, 07:30, 07:45)");
        }
    }

    private static boolean isOnQuarterHour(LocalTime time) {
        return time.getMinute() % 15 == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }
}
