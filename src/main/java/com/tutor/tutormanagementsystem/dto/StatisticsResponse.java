package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;
import java.util.List;

public record StatisticsResponse(
        BigDecimal totalIncome,
        List<MonthlyAmount> incomeByMonth,
        List<MonthlyAmount> revenueByMonth,
        long totalCompletedLessons,
        List<MonthlyCount> completedLessonsByMonth,
        List<SubjectStats> subjectBreakdown,
        List<SubjectStatsByMonth> subjectBreakdownByMonth,
        List<DebtResponse> debts,
        BigDecimal totalOutstandingDebt,
        // "this month" headline numbers - shown as the first thing on the dashboard
        BigDecimal revenueThisMonth,
        BigDecimal incomeReceivedThisMonth,
        long lessonsThisMonth,
        long minutesThisMonth
) {
}
