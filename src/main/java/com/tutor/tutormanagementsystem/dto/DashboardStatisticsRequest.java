package com.tutor.tutormanagementsystem.dto;

import java.time.LocalDate;

// filters for the unified statistics dashboard - startDate/endDate define the KPI
// timeframe (This Month / Last Month / Year to Date / All Time / Custom Range are
// all just different date ranges computed on the frontend and sent as concrete
// dates, so the backend only ever deals with one simple range). subjectId is
// optional - null means "every subject". the last-12-months trend chart always
// covers the trailing 12 months regardless of this range, so it isn't affected
// by these filters.
public record DashboardStatisticsRequest(LocalDate startDate, LocalDate endDate, Long subjectId) {
}
