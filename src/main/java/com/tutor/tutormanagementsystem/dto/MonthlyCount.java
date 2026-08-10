package com.tutor.tutormanagementsystem.dto;

// one row of the "lessons per month" table - e.g. year=2026, month=8, count=14
public record MonthlyCount(int year, int month, long count) {
}
