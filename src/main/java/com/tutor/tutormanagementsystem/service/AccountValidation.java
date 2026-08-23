package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidStudentDataException;

import java.math.BigDecimal;
import java.util.regex.Pattern;

// shared validation for the account fields both StudentService and UserService write.
// the two used to carry their own byte-identical copies of these rules (and their own
// copy of the email regex), so a change to what counts as a valid email had to be made
// twice and could silently drift.
//
// static like TimeValidation, for the same reason: these are pure rules with no state
// and no dependencies, so there's nothing to inject.
public final class AccountValidation {

    private AccountValidation() {
    }

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\d+$");

    private static final int MIN_PASSWORD_LENGTH = 4;

    // lowercased and trimmed so the unique constraint on User.email means "one account
    // per address" rather than "one per exact spelling". null-safe on purpose, so
    // requireValidEmail below still reports a missing email as a friendly validation
    // error instead of this throwing a NullPointerException first
    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    public static void requireValidEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new InvalidStudentDataException("Please enter a valid email address");
        }
    }

    public static void requireValidPassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new InvalidStudentDataException(
                    "Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
    }

    public static void requireValidPhone(String phone) {
        if (phone == null || !PHONE_PATTERN.matcher(phone).matches()) {
            throw new InvalidStudentDataException("Phone number must contain digits only");
        }
    }

    public static void requireValidHourlyRate(BigDecimal hourlyRate) {
        if (hourlyRate == null
                || hourlyRate.stripTrailingZeros().scale() > 0
                || hourlyRate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidStudentDataException("Hourly rate must be a positive whole number");
        }
    }
}
