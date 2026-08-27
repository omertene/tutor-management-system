package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.ScheduleRuleRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleRuleResponse;
import com.tutor.tutormanagementsystem.exception.ScheduleConflictException;
import com.tutor.tutormanagementsystem.exception.ScheduleRuleNotFoundException;
import com.tutor.tutormanagementsystem.model.ScheduleRule;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.List;


/* Service for managing recurring weekly availability rules for the teacher */

@Service
@RequiredArgsConstructor
public class ScheduleRuleService {

    private final ScheduleRuleRepository scheduleRuleRepository;
    private final LessonService lessonService;


    /* Creates a new recurring weekly availability rule after validating time ranges and overlaps */
    @Transactional
    public ScheduleRuleResponse createScheduleRule(ScheduleRuleRequest request) {

        /* Ensure start time is strictly before end time */
        TimeValidation.requireValidRange(request.startTime(), request.endTime());

        /* Check for overlapping availability rules on the same day of the week */
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

    /* Returns all recurring weekly availability rules in the system */
    public List<ScheduleRuleResponse> getAllScheduleRules() {
        return scheduleRuleRepository.findAll().stream()
                .map(rule -> new ScheduleRuleResponse(rule.getId(), rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime()))
                .toList();
    }

    /* Returns recurring availability rules for a specific day of the week */
    public List<ScheduleRuleResponse> getRulesForDay(DayOfWeek day) {
        return scheduleRuleRepository.findAllByDayOfWeek(day).stream()
                .map(rule -> new ScheduleRuleResponse(rule.getId(), rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime()))
                .toList();
    }


    /* Counts how many future scheduled lessons will lose their recurring time slot if this rule is deleted */
    public long countUpcomingLessonsAffectedByDeletion(Long ruleId) {
        ScheduleRule rule = scheduleRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ScheduleRuleNotFoundException("Schedule rule not found"));

        return lessonService.countUpcomingLessonsInWeeklySlot(rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime());
    }

    /* Counts how many future scheduled lessons will fall outside the modified rule's time boundary */
    public long countUpcomingLessonsAffectedByEdit(Long ruleId, ScheduleRuleRequest newRequest) {

        ScheduleRule rule = scheduleRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ScheduleRuleNotFoundException("Schedule rule not found"));

        return lessonService.countUpcomingLessonsLosingCoverage(
                rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime(),
                newRequest.dayOfWeek(), newRequest.startTime(), newRequest.endTime());
    }


    /* Updates an existing recurring rule after validating ranges and checking for overlaps with other rules */
    @Transactional
    public ScheduleRuleResponse updateScheduleRule(Long ruleId, ScheduleRuleRequest request) {
        ScheduleRule rule = scheduleRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ScheduleRuleNotFoundException("Schedule rule not found"));

        TimeValidation.requireValidRange(request.startTime(), request.endTime());

        /* Check for overlaps on the new day/time, excluding the rule itself from self-overlap */
        boolean overlapping = scheduleRuleRepository
                .findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.dayOfWeek(), request.endTime(), request.startTime())
                .stream()
                .anyMatch(other -> !other.getId().equals(ruleId));

        if (overlapping) {
            throw new ScheduleConflictException("This time overlaps an existing rule");
        }

        rule.setDayOfWeek(request.dayOfWeek());
        rule.setStartTime(request.startTime());
        rule.setEndTime(request.endTime());

        scheduleRuleRepository.save(rule);

        return new ScheduleRuleResponse(rule.getId(), rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime());
    }


    /* Permanently deletes a recurring schedule rule */
    @Transactional
    public void deleteScheduleRule(Long ruleId) {
        if (!scheduleRuleRepository.existsById(ruleId)) {
            throw new ScheduleRuleNotFoundException("Schedule rule not found");
        }

        scheduleRuleRepository.deleteById(ruleId);
    }
}
