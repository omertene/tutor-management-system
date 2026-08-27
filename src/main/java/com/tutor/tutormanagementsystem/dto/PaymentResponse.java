package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/* A payment as returned to the client, with the student's name already resolved */
public record PaymentResponse(
        Long id,
        Long studentId,
        String studentFirstName,
        String studentLastName,
        BigDecimal amount,
        PaymentMethod method,
        String notes,
        LocalDate paymentDate,
        LocalDateTime createdAt
) {
}
