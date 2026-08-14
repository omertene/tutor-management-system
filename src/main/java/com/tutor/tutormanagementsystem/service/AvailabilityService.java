package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.model.OverrideType;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.model.ScheduleRule;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final ScheduleRuleRepository scheduleRuleRepository;
    private final ScheduleOverrideRepository scheduleOverrideRepository;

    // checks the weekly rule for this day, minus any BLOCK override, plus any ADD override
    public boolean isTimeAvailable(LocalDate date, LocalTime startTime, LocalTime endTime) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        boolean coveredByRule = scheduleRuleRepository.findAllByDayOfWeek(dayOfWeek).stream()
                .anyMatch(rule -> fullyContains(rule, startTime, endTime));

        List<ScheduleOverride> overridesOnDate = scheduleOverrideRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(date, endTime, startTime);

        boolean blocked = overridesOnDate.stream().anyMatch(o -> o.getType() == OverrideType.BLOCK);
        boolean addedByOverride = overridesOnDate.stream()
                .anyMatch(o -> o.getType() == OverrideType.ADD
                        && !o.getStartTime().isAfter(startTime) && !o.getEndTime().isBefore(endTime));

        if (addedByOverride) {
            return true;
        }

        return coveredByRule && !blocked;
    }

    private boolean fullyContains(ScheduleRule rule, LocalTime startTime, LocalTime endTime) {
        return !rule.getStartTime().isAfter(startTime) && !rule.getEndTime().isBefore(endTime);
    }
}
