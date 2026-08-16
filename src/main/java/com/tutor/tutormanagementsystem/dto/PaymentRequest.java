package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentRequest(Long studentId, BigDecimal amount, PaymentMethod method, String notes, LocalDate paymentDate) {
}
