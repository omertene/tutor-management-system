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

    @GetMapping
    public ResponseEntity<List<ScheduleRuleResponse>> getAllScheduleRules() {
        return ResponseEntity.ok(scheduleRuleService.getAllScheduleRules());
    }

    @PreAuthorize("hasRole('TEACHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScheduleRule(@PathVariable("id") Long ruleId) {
        scheduleRuleService.deleteScheduleRule(ruleId);
        return ResponseEntity.noContent().build();
    }
}
