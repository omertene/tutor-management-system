package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

/* How much a student owes overall - owed minus paid */
public record DebtResponse(
        Long studentId,
        String studentFirstName,
        String studentLastName,
        BigDecimal totalOwed,
        BigDecimal totalPaid,
        BigDecimal debt
) {
}
