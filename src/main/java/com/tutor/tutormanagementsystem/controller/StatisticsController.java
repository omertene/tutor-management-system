package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.DashboardStatisticsRequest;
import com.tutor.tutormanagementsystem.dto.DashboardStatisticsResponse;
import com.tutor.tutormanagementsystem.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/* teacher-only reporting endpoints that back the statistics dashboard - revenue,
   lesson counts, etc. all the actual number-crunching happens in
   StatisticsService, this just validates/shapes the incoming date range. */
@RestController
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    /* unified statistics dashboard - startDate/endDate define the KPI/table
       timeframe (the frontend resolves "this month", "this year", or "all time"
       into concrete dates before calling this), subjectId is optional */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/statistics/dashboard")
    public ResponseEntity<DashboardStatisticsResponse> getDashboardStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long subjectId) {
        return ResponseEntity.ok(statisticsService.getDashboardStatistics(
                new DashboardStatisticsRequest(startDate, endDate, subjectId)));
    }

    /* every year that has at least one completed lesson - populates the dashboard's
       year picker so an empty year is never offered */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/statistics/years")
    public ResponseEntity<List<Integer>> getYearsWithData() {
        return ResponseEntity.ok(statisticsService.getYearsWithData());
    }
}
