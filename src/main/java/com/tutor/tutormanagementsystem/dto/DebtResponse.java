package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;


public record DebtResponse(
        Long studentId,
        String studentFirstName,
        String studentLastName,
        BigDecimal totalOwed,
        BigDecimal totalPaid,
        BigDecimal debt
) {
}
