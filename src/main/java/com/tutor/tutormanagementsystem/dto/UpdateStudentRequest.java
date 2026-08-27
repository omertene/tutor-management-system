package com.tutor.tutormanagementsystem.dto;

import java.math.BigDecimal;

/* Request to update a student's profile fields */
public record UpdateStudentRequest(
        String firstName,
        String lastName,
        String phone,
        BigDecimal hourlyRate,
        String educationLevel,
        String notes
) {
}
