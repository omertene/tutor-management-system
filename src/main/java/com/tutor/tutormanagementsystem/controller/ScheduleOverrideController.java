package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.ScheduleOverrideRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideResponse;
import com.tutor.tutormanagementsystem.service.ScheduleOverrideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/* teacher-only - for one-off exceptions to the weekly schedule. students see
    a read-only version via StudentAvailabilityController */
@RestController
@RequestMapping("/teacher/schedule-overrides")
@RequiredArgsConstructor
public class ScheduleOverrideController {

    private final ScheduleOverrideService scheduleOverrideService;

    /* adds a new one-off override (either extra availability or a block on a normally-open slot) */
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping
    public ResponseEntity<ScheduleOverrideResponse> createScheduleOverride(@RequestBody ScheduleOverrideRequest request) {
        return ResponseEntity.ok(scheduleOverrideService.createScheduleOverride(request));
    }

    /* lists every override, past and future */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping
    public ResponseEntity<List<ScheduleOverrideResponse>> getAllScheduleOverrides() {
        return ResponseEntity.ok(scheduleOverrideService.getAllScheduleOverrides());
    }

    /* edits an existing override's date/time/type */
    @PreAuthorize("hasRole('TEACHER')")
    @PutMapping("/{id}")
    public ResponseEntity<ScheduleOverrideResponse> updateScheduleOverride(
            @PathVariable("id") Long overrideId, @RequestBody ScheduleOverrideRequest request) {
        return ResponseEntity.ok(scheduleOverrideService.updateScheduleOverride(overrideId, request));
    }

    /* removes an override */
    @PreAuthorize("hasRole('TEACHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScheduleOverride(@PathVariable("id") Long overrideId) {
        scheduleOverrideService.deleteScheduleOverride(overrideId);
        return ResponseEntity.noContent().build();
    }
}
