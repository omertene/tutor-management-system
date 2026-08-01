package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.ScheduleOverrideRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideResponse;
import com.tutor.tutormanagementsystem.service.ScheduleOverrideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/teacher/schedule-overrides")
@RequiredArgsConstructor
public class ScheduleOverrideController {

    private final ScheduleOverrideService scheduleOverrideService;

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping
    public ResponseEntity<ScheduleOverrideResponse> createScheduleOverride(@RequestBody ScheduleOverrideRequest request) {
        return ResponseEntity.ok(scheduleOverrideService.createScheduleOverride(request));
    }

    @GetMapping
    public ResponseEntity<List<ScheduleOverrideResponse>> getAllScheduleOverrides() {
        return ResponseEntity.ok(scheduleOverrideService.getAllScheduleOverrides());
    }
}
