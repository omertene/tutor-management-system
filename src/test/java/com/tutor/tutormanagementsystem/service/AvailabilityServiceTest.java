package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.model.OverrideType;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.model.ScheduleRule;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/* unit test with Mockito - the two repositories are fakes, so no database is needed.
   each test follows Arrange (set up the fake data), Act (call the method), Assert (check the answer).
   note the fake override repository returns whatever we give it, so these tests
   check the service's decision logic, not the SQL overlap query itself. */

@ExtendWith(MockitoExtension.class)
class AvailabilityServiceTest {

    private static final LocalDate DATE = LocalDate.of(2026, 11, 15);

    @Mock
    private ScheduleRuleRepository ruleRepository;

    @Mock
    private ScheduleOverrideRepository overrideRepository;

    @InjectMocks
    private AvailabilityService service;

    /* the teacher works 10:00-14:00 on the day of DATE */
    private void givenWeeklyRule(int fromHour, int toHour) {
        ScheduleRule rule = ScheduleRule.builder()
                .dayOfWeek(DATE.getDayOfWeek())
                .startTime(LocalTime.of(fromHour, 0))
                .endTime(LocalTime.of(toHour, 0))
                .build();
        when(ruleRepository.findAllByDayOfWeek(DATE.getDayOfWeek())).thenReturn(List.of(rule));
    }

    private void givenNoWeeklyRule() {
        when(ruleRepository.findAllByDayOfWeek(DATE.getDayOfWeek())).thenReturn(List.of());
    }

    /* the overrides that overlap the requested slot (the real repository filters by overlap) */
    private void givenOverrides(ScheduleOverride... overrides) {
        when(overrideRepository.findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(
                org.mockito.ArgumentMatchers.eq(DATE),
                org.mockito.ArgumentMatchers.any(LocalTime.class),
                org.mockito.ArgumentMatchers.any(LocalTime.class))).thenReturn(List.of(overrides));
    }

    private ScheduleOverride override(OverrideType type, int fromHour, int toHour) {
        return ScheduleOverride.builder()
                .date(DATE)
                .startTime(LocalTime.of(fromHour, 0))
                .endTime(LocalTime.of(toHour, 0))
                .type(type)
                .build();
    }

    private boolean ask(int fromHour, int toHour) {
        return service.isTimeAvailable(DATE, LocalTime.of(fromHour, 0), LocalTime.of(toHour, 0));
    }

    @Test
    void slotInsideWeeklyRule_isAvailable() {
        givenWeeklyRule(10, 14);
        givenOverrides();

        assertThat(ask(11, 12)).isTrue();
    }

    @Test
    void slotExactlyMatchingRuleBoundaries_isAvailable() {
        givenWeeklyRule(10, 14);
        givenOverrides();

        assertThat(ask(10, 14)).isTrue();
    }

    @Test
    void slotOutsideWeeklyRule_isNotAvailable() {
        givenWeeklyRule(10, 14);
        givenOverrides();

        assertThat(ask(15, 16)).isFalse();
    }

    @Test
    void slotStartingInsideRuleButEndingAfterIt_isNotAvailable() {
        givenWeeklyRule(10, 14);
        givenOverrides();

        assertThat(ask(13, 15)).isFalse();
    }

    @Test
    void noRuleForThatDay_isNotAvailable() {
        givenNoWeeklyRule();
        givenOverrides();

        assertThat(ask(11, 12)).isFalse();
    }

    @Test
    void blockOverlappingSlotInsideRule_makesItUnavailable() {
        givenWeeklyRule(10, 14);
        givenOverrides(override(OverrideType.BLOCK, 11, 12));

        assertThat(ask(11, 12)).isFalse();
    }

    @Test
    void addOverrideFullyCoveringSlot_opensTimeOutsideTheRule() {
        givenWeeklyRule(10, 14);
        givenOverrides(override(OverrideType.ADD, 16, 18));

        assertThat(ask(16, 17)).isTrue();
    }

    @Test
    void addOverrideCoveringOnlyPartOfSlot_isNotEnough() {
        givenWeeklyRule(10, 14);
        givenOverrides(override(OverrideType.ADD, 16, 17));

        assertThat(ask(16, 18)).isFalse();
    }

    /* documents the current behaviour: ADD has the highest priority, even over a BLOCK */
    @Test
    void addOverrideWinsOverBlock_whenItCoversTheSlot() {
        givenWeeklyRule(10, 14);
        givenOverrides(
                override(OverrideType.BLOCK, 11, 12),
                override(OverrideType.ADD, 11, 12));

        assertThat(ask(11, 12)).isTrue();
    }
}
