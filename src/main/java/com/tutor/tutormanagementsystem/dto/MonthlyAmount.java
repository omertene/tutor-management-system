package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

// one row of the "income per month" table - e.g. year=2026, month=8, total=1200
public record MonthlyAmount(int year, int month, BigDecimal total) {
}
