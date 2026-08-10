package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;
import java.util.List;

public record StatisticsResponse(
        BigDecimal totalIncome,
        List<MonthlyAmount> incomeByMonth,
        long totalCompletedLessons,
        List<MonthlyCount> completedLessonsByMonth,
        List<SubjectStats> subjectBreakdown,
        List<DebtResponse> debts
) {
}
