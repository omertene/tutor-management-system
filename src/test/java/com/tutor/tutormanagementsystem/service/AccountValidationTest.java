package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidStudentDataException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/* pure unit test of the shared account-field rules - static methods, no Spring, no mocks */

class AccountValidationTest {

    @Test
    void normalizeEmail_trimsSpacesAndLowercases() {
        assertThat(AccountValidation.normalizeEmail("  Dana.Levi@Example.COM ")).isEqualTo("dana.levi@example.com");
    }

    @Test
    void normalizeEmail_isNullSafe() {
        assertThat(AccountValidation.normalizeEmail(null)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"a@b.co", "dana.levi@example.com", "x+tag@sub.domain.org"})
    void validEmails_areAccepted(String email) {
        assertThatCode(() -> AccountValidation.requireValidEmail(email)).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"no-at-sign.com", "missing@dot", "@no-local.com", "two@@signs.com", "has space@x.com"})
    void invalidEmails_areRejected(String email) {
        assertThatThrownBy(() -> AccountValidation.requireValidEmail(email))
                .isInstanceOf(InvalidStudentDataException.class);
    }

    @Test
    void passwordOfFourCharacters_isAccepted() {
        assertThatCode(() -> AccountValidation.requireValidPassword("abcd")).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"abc"})
    void tooShortOrMissingPassword_isRejected(String password) {
        assertThatThrownBy(() -> AccountValidation.requireValidPassword(password))
                .isInstanceOf(InvalidStudentDataException.class)
                .hasMessageContaining("at least");
    }

    @Test
    void phoneWithDigitsOnly_isAccepted() {
        assertThatCode(() -> AccountValidation.requireValidPhone("0501234567")).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"050-1234567", "+972501234567", "05012 34567", "phone"})
    void phoneWithAnythingButDigits_isRejected(String phone) {
        assertThatThrownBy(() -> AccountValidation.requireValidPhone(phone))
                .isInstanceOf(InvalidStudentDataException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "100", "100.00", "250"})
    void positiveWholeHourlyRate_isAccepted(String rate) {
        assertThatCode(() -> AccountValidation.requireValidHourlyRate(new BigDecimal(rate)))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-5", "100.5", "99.99"})
    void zeroNegativeOrFractionalHourlyRate_isRejected(String rate) {
        assertThatThrownBy(() -> AccountValidation.requireValidHourlyRate(new BigDecimal(rate)))
                .isInstanceOf(InvalidStudentDataException.class);
    }

    @Test
    void missingHourlyRate_isRejected() {
        assertThatThrownBy(() -> AccountValidation.requireValidHourlyRate(null))
                .isInstanceOf(InvalidStudentDataException.class);
    }
}
