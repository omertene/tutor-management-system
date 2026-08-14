package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long id,
        Long studentId,
        String studentFirstName,
        String studentLastName,
        BigDecimal amount,
        PaymentMethod method,
        String notes,
        LocalDateTime createdAt
) {
}
