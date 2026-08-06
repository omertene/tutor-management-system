package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.PaymentMethod;

import java.math.BigDecimal;

public record PaymentRequest(Long studentId, BigDecimal amount, PaymentMethod method, String notes) {
}
