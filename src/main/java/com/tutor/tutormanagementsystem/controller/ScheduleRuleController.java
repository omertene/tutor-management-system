package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.ScheduleRuleRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleRuleResponse;
import com.tutor.tutormanagementsystem.service.ScheduleRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/teacher/schedule-rules")
@RequiredArgsConstructor
public class ScheduleRuleController {

    private final ScheduleRuleService scheduleRuleService;

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping
    public ResponseEntity<ScheduleRuleResponse> createScheduleRule(@RequestBody ScheduleRuleRequest request) {
        return ResponseEntity.ok(scheduleRuleService.createScheduleRule(request));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping
    public ResponseEntity<List<ScheduleRuleResponse>> getAllScheduleRules() {
        return ResponseEntity.ok(scheduleRuleService.getAllScheduleRules());
    }

    // count of upcoming lessons that would be left on an unavailable slot if this
    // rule were deleted - the frontend calls this before showing a delete confirmation
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/{id}/affected-lessons-count")
    public ResponseEntity<Long> countUpcomingLessonsAffectedByDeletion(@PathVariable("id") Long ruleId) {
        return ResponseEntity.ok(scheduleRuleService.countUpcomingLessonsAffectedByDeletion(ruleId));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/{id}/affected-lessons-count-for-edit")
    public ResponseEntity<Long> countUpcomingLessonsAffectedByEdit(
            @PathVariable("id") Long ruleId, @RequestBody ScheduleRuleRequest request) {
        return ResponseEntity.ok(scheduleRuleService.countUpcomingLessonsAffectedByEdit(ruleId, request));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PutMapping("/{id}")
    public ResponseEntity<ScheduleRuleResponse> updateScheduleRule(
            @PathVariable("id") Long ruleId, @RequestBody ScheduleRuleRequest request) {
        return ResponseEntity.ok(scheduleRuleService.updateScheduleRule(ruleId, request));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScheduleRule(@PathVariable("id") Long ruleId) {
        scheduleRuleService.deleteScheduleRule(ruleId);
        return ResponseEntity.noContent().build();
    }
}
