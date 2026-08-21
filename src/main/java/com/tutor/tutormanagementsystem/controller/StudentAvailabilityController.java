package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.AvailabilityOverrideResponse;
import com.tutor.tutormanagementsystem.dto.ScheduleRuleResponse;
import com.tutor.tutormanagementsystem.service.ScheduleOverrideService;
import com.tutor.tutormanagementsystem.service.ScheduleRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentAvailabilityController {

    private final ScheduleRuleService scheduleRuleService;
    private final ScheduleOverrideService scheduleOverrideService;

    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/schedule-rules")
    public ResponseEntity<List<ScheduleRuleResponse>> getScheduleRules() {
        return ResponseEntity.ok(scheduleRuleService.getAllScheduleRules());
    }

    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/schedule-overrides")
    public ResponseEntity<List<AvailabilityOverrideResponse>> getScheduleOverrides() {
        return ResponseEntity.ok(scheduleOverrideService.getAllScheduleOverridesForStudent());
    }
}
