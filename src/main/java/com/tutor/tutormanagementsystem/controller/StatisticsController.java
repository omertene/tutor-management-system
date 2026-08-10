package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.StatisticsResponse;
import com.tutor.tutormanagementsystem.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    // teacher-only - aggregate business data across every student, not something
    // a student should be able to see about themselves plus everyone else
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/statistics")
    public ResponseEntity<StatisticsResponse> getStatistics() {
        return ResponseEntity.ok(statisticsService.getStatistics());
    }
}
