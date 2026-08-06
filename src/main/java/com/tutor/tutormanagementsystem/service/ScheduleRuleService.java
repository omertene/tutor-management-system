package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.ScheduleRuleRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleRuleResponse;
import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;
import com.tutor.tutormanagementsystem.exception.ScheduleConflictException;
import com.tutor.tutormanagementsystem.exception.ScheduleRuleNotFoundException;
import com.tutor.tutormanagementsystem.model.ScheduleRule;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleRuleService {

    private final ScheduleRuleRepository scheduleRuleRepository;

    public ScheduleRuleResponse createScheduleRule(ScheduleRuleRequest request) {

        if (request.startTime().isAfter(request.endTime())) {
            throw new InvalidTimeRangeException("Start time must be before end time");
        }
        List<ScheduleRule> overlapping = scheduleRuleRepository
                .findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.dayOfWeek(), request.endTime(), request.startTime());

        if (!overlapping.isEmpty()) {
            throw new ScheduleConflictException("This time overlaps an existing rule");
        }

        ScheduleRule scheduleRule = ScheduleRule.builder()
                .dayOfWeek(request.dayOfWeek()).startTime(request.startTime()).endTime(request.endTime()).build();

        scheduleRuleRepository.save(scheduleRule);

        return new ScheduleRuleResponse(scheduleRule.getId(),
                scheduleRule.getDayOfWeek(), scheduleRule.getStartTime(), scheduleRule.getEndTime());
    }

    public List<ScheduleRuleResponse> getAllScheduleRules() {
        return scheduleRuleRepository.findAll().stream()
                .map(rule -> new ScheduleRuleResponse(rule.getId(), rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime()))
                .toList();
    }

    public List<ScheduleRuleResponse> getRulesForDay(DayOfWeek day) {
        return scheduleRuleRepository.findAllByDayOfWeek(day).stream()
                .map(rule -> new ScheduleRuleResponse(rule.getId(), rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime()))
                .toList();
    }

    // undoes a mistaken or outdated recurring availability rule. nothing else
    // references a ScheduleRule by FK, so this is a plain delete, no guard needed
    public void deleteScheduleRule(Long ruleId) {
        if (!scheduleRuleRepository.existsById(ruleId)) {
            throw new ScheduleRuleNotFoundException("Schedule rule not found");
        }

        scheduleRuleRepository.deleteById(ruleId);
    }
}
