package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

/* One month of data for the "monthly performance trend" chart */
public record MonthlyTrend(int year, int month, BigDecimal revenue, BigDecimal incomeReceived, double hours) {
}
