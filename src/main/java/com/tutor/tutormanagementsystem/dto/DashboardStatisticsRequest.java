package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;

/* Filters for the statistics dashboard - date range plus an optional subject
   (null = all subjects) */
public record DashboardStatisticsRequest(LocalDate startDate, LocalDate endDate, Long subjectId) {
}
