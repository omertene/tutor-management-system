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

@Service
@RequiredArgsConstructor
public class ScheduleRuleService {

    private final ScheduleRuleRepository scheduleRuleRepository;
    private final LessonService lessonService;

    @Transactional
    public ScheduleRuleResponse createScheduleRule(ScheduleRuleRequest request) {

        TimeValidation.requireValidRange(request.startTime(), request.endTime());
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


    public long countUpcomingLessonsAffectedByDeletion(Long ruleId) {
        ScheduleRule rule = scheduleRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ScheduleRuleNotFoundException("Schedule rule not found"));

        return lessonService.countUpcomingLessonsInWeeklySlot(rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime());
    }

    public long countUpcomingLessonsAffectedByEdit(Long ruleId, ScheduleRuleRequest newRequest) {
        ScheduleRule rule = scheduleRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ScheduleRuleNotFoundException("Schedule rule not found"));

        return lessonService.countUpcomingLessonsLosingCoverage(
                rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime(),
                newRequest.dayOfWeek(), newRequest.startTime(), newRequest.endTime());
    }

    @Transactional
    public ScheduleRuleResponse updateScheduleRule(Long ruleId, ScheduleRuleRequest request) {
        ScheduleRule rule = scheduleRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ScheduleRuleNotFoundException("Schedule rule not found"));

        TimeValidation.requireValidRange(request.startTime(), request.endTime());

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

    @Transactional
    public void deleteScheduleRule(Long ruleId) {
        if (!scheduleRuleRepository.existsById(ruleId)) {
            throw new ScheduleRuleNotFoundException("Schedule rule not found");
        }

        scheduleRuleRepository.deleteById(ruleId);
    }
}
