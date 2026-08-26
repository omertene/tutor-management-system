package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidStudentDataException;

import java.math.BigDecimal;
import java.util.regex.Pattern;

/* shared validation for the account fields both StudentService and UserService write.
   centralized here to avoid duplicating the same validation logic across services.
   static because these are pure rules with no state and no dependencies, so there's nothing to inject. */

public final class AccountValidation {

    private AccountValidation() {
    }

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\d+$");

    private static final int MIN_PASSWORD_LENGTH = 4;

    /* Trims spaces and lowercases email to prevent duplicate accounts with different casing.
       Null-safe so missing emails throw a clean validation error instead of a NullPointerException. */
    public static String normalizeEmail(String email) {
        // null-safe check prevents NullPointerException before validation
        return email == null ? null : email.trim().toLowerCase();
    }

    /* Validates email format against standard regex pattern */
    public static void requireValidEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new InvalidStudentDataException("Please enter a valid email address");
        }
    }

    /* Enforces minimum password length */
    public static void requireValidPassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new InvalidStudentDataException(
                    "Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
    }

    /* Ensures phone number contains digits only */
    public static void requireValidPhone(String phone) {
        if (phone == null || !PHONE_PATTERN.matcher(phone).matches()) {
            throw new InvalidStudentDataException("Phone number must contain digits only");
        }
    }

    /* Validates that rate is positive and has no decimal fractions */
    public static void requireValidHourlyRate(BigDecimal hourlyRate) {
        if (hourlyRate == null
                || hourlyRate.stripTrailingZeros().scale() > 0
                || hourlyRate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidStudentDataException("Hourly rate must be a positive whole number");
        }
    }
}
