package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

/* Request to record a payment from a student */
public record PaymentRequest(Long studentId, BigDecimal amount, PaymentMethod method, String notes, LocalDate paymentDate) {
}
