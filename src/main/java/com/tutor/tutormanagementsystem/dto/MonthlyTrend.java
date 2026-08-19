package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

// one month of the "monthly performance trend" chart - always part of a trailing
// 12-month series, independent of the dashboard's own time-range filter
public record MonthlyTrend(int year, int month, BigDecimal revenue, BigDecimal incomeReceived, double hours) {
}
