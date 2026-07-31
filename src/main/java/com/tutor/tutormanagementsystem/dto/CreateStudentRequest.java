package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

public record CreateStudentRequest(
        String email,
        String password,
        String firstName,
        String lastName,
        String phone,
        BigDecimal hourlyRate,
        String educationLevel,
        String notes
) {
}
