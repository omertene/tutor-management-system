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

/* Evaluates teacher time-slot availability by merging recurring weekly rules
   with date-specific schedule overrides (BLOCK/ADD priority). */

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final ScheduleRuleRepository scheduleRuleRepository;
    private final ScheduleOverrideRepository scheduleOverrideRepository;

    /* Determines if a requested time slot is open for booking on a specific date */
    public boolean isTimeAvailable(LocalDate date, LocalTime startTime, LocalTime endTime) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        /* Check if target slot falls entirely within standard weekly working hours */
        boolean coveredByRule = scheduleRuleRepository.findAllByDayOfWeek(dayOfWeek).stream()
                .anyMatch(rule -> fullyContains(rule, startTime, endTime));

        /* Fetch any overrides on this date that overlap the requested time interval */
        List<ScheduleOverride> overridesOnDate = scheduleOverrideRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(date, endTime, startTime);

        /* Any overlap with a BLOCK override invalidates availability */
        boolean blocked = overridesOnDate.stream().anyMatch(o -> o.getType() == OverrideType.BLOCK);

        /* ADD override grants availability only if it fully contains the requested lesson slot */
        boolean addedByOverride = overridesOnDate.stream()
                .anyMatch(o -> o.getType() == OverrideType.ADD
                        && !o.getStartTime().isAfter(startTime) && !o.getEndTime().isBefore(endTime));

        /* ADD override takes highest precedence */
        if (addedByOverride) {
            return true;
        }

        /* Otherwise slot must be within weekly rules and free of block overrides */
        return coveredByRule && !blocked;
    }

    /* Helper checking if a rule interval [ruleStart, ruleEnd] completely wraps [start, end] */
    private boolean fullyContains(ScheduleRule rule, LocalTime startTime, LocalTime endTime) {
        return !rule.getStartTime().isAfter(startTime) && !rule.getEndTime().isBefore(endTime);
    }
}
