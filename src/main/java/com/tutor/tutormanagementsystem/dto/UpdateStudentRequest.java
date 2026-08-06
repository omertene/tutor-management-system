package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;


public record UpdateStudentRequest(
        String firstName,
        String lastName,
        String phone,
        BigDecimal hourlyRate,
        String educationLevel,
        String notes
) {
}
