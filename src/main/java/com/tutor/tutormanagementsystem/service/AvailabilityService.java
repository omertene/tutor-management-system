package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.model.OverrideType;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

// owns the weekly-rule + per-date-override logic, so anything that needs to know
// whether a given time slot is available (booking a lesson, showing free slots
// on a calendar screen, etc.) goes through here instead of duplicating this logic
@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final ScheduleRuleRepository scheduleRuleRepository;
    private final ScheduleOverrideRepository scheduleOverrideRepository;

    // checks the weekly rule for this day, minus any BLOCK override, plus any ADD override
    public boolean isTimeAvailable(LocalDate date, LocalTime startTime, LocalTime endTime) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        boolean coveredByRule = !scheduleRuleRepository
                .findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(dayOfWeek, endTime, startTime)
                .isEmpty();

        List<ScheduleOverride> overridesOnDate = scheduleOverrideRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(date, endTime, startTime);

        boolean blocked = overridesOnDate.stream().anyMatch(o -> o.getType() == OverrideType.BLOCK);
        boolean addedByOverride = overridesOnDate.stream().anyMatch(o -> o.getType() == OverrideType.ADD);

        if (addedByOverride) {
            return true;
        }

        return coveredByRule && !blocked;
    }
}
