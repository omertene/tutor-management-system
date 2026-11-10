package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/* pure unit test - no Spring, no database. TimeValidation is a static utility,
   so we just call it with different inputs and check if it throws. */

class TimeValidationTest {

    @Test
    void validRangeOnQuarterHours_doesNotThrow() {
        assertThatCode(() -> TimeValidation.requireValidRange(LocalTime.of(7, 0), LocalTime.of(8, 15)))
                .doesNotThrowAnyException();
    }

    @Test
    void startEqualToEnd_throws() {
        assertThatThrownBy(() -> TimeValidation.requireValidRange(LocalTime.of(9, 0), LocalTime.of(9, 0)))
                .isInstanceOf(InvalidTimeRangeException.class)
                .hasMessageContaining("before");
    }

    @Test
    void startAfterEnd_throws() {
        assertThatThrownBy(() -> TimeValidation.requireValidRange(LocalTime.of(10, 0), LocalTime.of(9, 0)))
                .isInstanceOf(InvalidTimeRangeException.class);
    }

    /* the same check runs once for the start time and once for the end time */
    @ParameterizedTest
    @CsvSource({
            "07:10, 08:00",
            "07:00, 08:05",
            "07:01, 08:00",
            "07:00, 07:59"
    })
    void timesNotOnQuarterHour_throw(String start, String end) {
        assertThatThrownBy(() -> TimeValidation.requireValidRange(LocalTime.parse(start), LocalTime.parse(end)))
                .isInstanceOf(InvalidTimeRangeException.class)
                .hasMessageContaining("15-minute");
    }

    @Test
    void nonZeroSeconds_throw() {
        assertThatThrownBy(() -> TimeValidation.requireValidRange(LocalTime.of(7, 15, 30), LocalTime.of(8, 0)))
                .isInstanceOf(InvalidTimeRangeException.class);
    }
}
