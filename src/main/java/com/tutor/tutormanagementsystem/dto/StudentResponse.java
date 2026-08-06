package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

public record StudentResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        BigDecimal hourlyRate,
        String educationLevel,
        String notes,
        boolean active
) {
}
