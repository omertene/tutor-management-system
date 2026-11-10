package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.AvailabilityOverrideResponse;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideResponse;
import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;
import com.tutor.tutormanagementsystem.exception.PastDateException;
import com.tutor.tutormanagementsystem.exception.ScheduleConflictException;
import com.tutor.tutormanagementsystem.exception.ScheduleOverrideNotFoundException;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/* unit test of the one-day exceptions to the weekly schedule. BLOCK removes time that is normally free,
   ADD opens extra time, and the service rejects overrides that would change nothing or that clash.
   The three repositories and LessonService are fakes - no database. */

@ExtendWith(MockitoExtension.class)
class ScheduleOverrideServiceTest {

    private static final LocalDate NEXT_WEEK = LocalDate.now().plusDays(7);

    @Mock
    private ScheduleOverrideRepository overrideRepository;

    @Mock
    private ScheduleRuleRepository ruleRepository;

    @Mock
    private LessonService lessonService;

    @InjectMocks
    private ScheduleOverrideService service;

    private ScheduleOverrideRequest request(LocalDate date, OverrideType type, int fromHour, int toHour) {
        return new ScheduleOverrideRequest(date, LocalTime.of(fromHour, 0), LocalTime.of(toHour, 0), type, "note");
    }

    private ScheduleOverride override(Long id, OverrideType type, int fromHour, int toHour) {
        return ScheduleOverride.builder().id(id).date(NEXT_WEEK)
                .startTime(LocalTime.of(fromHour, 0)).endTime(LocalTime.of(toHour, 0)).type(type).build();
    }

    private void givenOverlappingOverrides(ScheduleOverride... overrides) {
        when(overrideRepository.findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(any(), any(), any()))
                .thenReturn(List.of(overrides));
    }

    /* whether the requested time is already covered by a weekly rule */
    private void givenCoveredByWeeklyRule(boolean covered) {
        List<ScheduleRule> rules = covered
                ? List.of(ScheduleRule.builder().id(1L).dayOfWeek(DayOfWeek.SUNDAY)
                        .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(18, 0)).build())
                : List.of();
        when(ruleRepository.findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(any(), any(), any()))
                .thenReturn(rules);
    }

    /* ---------- create: basic validation ---------- */

    @Test
    void createOverride_forAPastDate_isRejected() {
        assertThatThrownBy(() -> service.createScheduleOverride(
                request(LocalDate.now().minusDays(1), OverrideType.BLOCK, 10, 11)))
                .isInstanceOf(PastDateException.class);
        verify(overrideRepository, never()).save(any());
    }

    @Test
    void createOverride_withInvalidTimes_isRejected() {
        assertThatThrownBy(() -> service.createScheduleOverride(request(NEXT_WEEK, OverrideType.BLOCK, 11, 10)))
                .isInstanceOf(InvalidTimeRangeException.class);
    }

    @Test
    void createOverride_overlappingAnotherOverride_isRejected() {
        givenOverlappingOverrides(override(9L, OverrideType.BLOCK, 10, 12));

        assertThatThrownBy(() -> service.createScheduleOverride(request(NEXT_WEEK, OverrideType.BLOCK, 11, 13)))
                .isInstanceOf(ScheduleConflictException.class)
                .hasMessageContaining("overlaps an existing override");
    }

    /* ---------- create: redundant overrides ---------- */

    @Test
    void block_ofTimeThatIsNotAvailableAnyway_isRejected() {
        givenOverlappingOverrides();
        givenCoveredByWeeklyRule(false);

        assertThatThrownBy(() -> service.createScheduleOverride(request(NEXT_WEEK, OverrideType.BLOCK, 10, 11)))
                .isInstanceOf(ScheduleConflictException.class)
                .hasMessageContaining("already unavailable");
        verify(overrideRepository, never()).save(any());
    }

    @Test
    void add_ofTimeThatIsAlreadyAvailable_isRejected() {
        givenOverlappingOverrides();
        givenCoveredByWeeklyRule(true);

        assertThatThrownBy(() -> service.createScheduleOverride(request(NEXT_WEEK, OverrideType.ADD, 10, 11)))
                .isInstanceOf(ScheduleConflictException.class)
                .hasMessageContaining("already available");
    }

    /* ---------- create: the successful cases ---------- */

    @Test
    void block_ofAvailableTimeWithNoLesson_isSaved() {
        givenOverlappingOverrides();
        givenCoveredByWeeklyRule(true);
        when(lessonService.hasScheduledLessonInRange(any(), any(), any())).thenReturn(false);

        ScheduleOverrideResponse response = service.createScheduleOverride(
                request(NEXT_WEEK, OverrideType.BLOCK, 10, 11));

        assertThat(response.type()).isEqualTo(OverrideType.BLOCK);
        assertThat(response.date()).isEqualTo(NEXT_WEEK);
        verify(overrideRepository).save(any(ScheduleOverride.class));
    }

    @Test
    void add_ofTimeOutsideTheWeeklyRules_isSaved() {
        givenOverlappingOverrides();
        givenCoveredByWeeklyRule(false);

        ScheduleOverrideResponse response = service.createScheduleOverride(
                request(NEXT_WEEK, OverrideType.ADD, 19, 21));

        assertThat(response.type()).isEqualTo(OverrideType.ADD);
        verify(overrideRepository).save(any(ScheduleOverride.class));
    }

    /* a teacher can't block time while a student has a scheduled lesson in it */
    @Test
    void block_overAScheduledLesson_isRejected() {
        givenOverlappingOverrides();
        givenCoveredByWeeklyRule(true);
        when(lessonService.hasScheduledLessonInRange(any(), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.createScheduleOverride(request(NEXT_WEEK, OverrideType.BLOCK, 10, 11)))
                .isInstanceOf(ScheduleConflictException.class)
                .hasMessageContaining("scheduled lesson");
        verify(overrideRepository, never()).save(any());
    }

    /* documents the current behaviour: "already covered" means ANY overlap with a weekly rule,
       so an ADD that only partly overlaps a rule (extending the day) is rejected too */
    @Test
    void add_thatOnlyPartlyOverlapsAWeeklyRule_isRejectedAsAlreadyAvailable() {
        givenOverlappingOverrides();
        givenCoveredByWeeklyRule(true);

        assertThatThrownBy(() -> service.createScheduleOverride(request(NEXT_WEEK, OverrideType.ADD, 17, 20)))
                .isInstanceOf(ScheduleConflictException.class);
    }

    /* ---------- update ---------- */

    @Test
    void updateOverride_unknownId_throwsNotFound() {
        when(overrideRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateScheduleOverride(5L, request(NEXT_WEEK, OverrideType.ADD, 19, 21)))
                .isInstanceOf(ScheduleOverrideNotFoundException.class);
    }

    @Test
    void updateOverride_overlappingOnlyItself_isAllowed() {
        ScheduleOverride existing = override(5L, OverrideType.ADD, 19, 21);
        when(overrideRepository.findById(5L)).thenReturn(Optional.of(existing));
        givenOverlappingOverrides(existing);
        givenCoveredByWeeklyRule(false);

        assertThatCode(() -> service.updateScheduleOverride(5L, request(NEXT_WEEK, OverrideType.ADD, 19, 22)))
                .doesNotThrowAnyException();
        assertThat(existing.getEndTime()).isEqualTo(LocalTime.of(22, 0));
    }

    @Test
    void updateOverride_toAPastDate_isRejected() {
        ScheduleOverride existing = override(5L, OverrideType.ADD, 19, 21);
        when(overrideRepository.findById(5L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateScheduleOverride(5L,
                request(LocalDate.now().minusDays(1), OverrideType.ADD, 19, 21)))
                .isInstanceOf(PastDateException.class)
                .hasMessageContaining("past date");
    }

    /* ---------- delete and the student's view ---------- */

    @Test
    void deleteOverride_unknownId_throwsNotFound() {
        when(overrideRepository.existsById(5L)).thenReturn(false);

        assertThatThrownBy(() -> service.deleteScheduleOverride(5L))
                .isInstanceOf(ScheduleOverrideNotFoundException.class);
        verify(overrideRepository, never()).deleteById(any());
    }

    @Test
    void deleteOverride_existingId_deletesIt() {
        when(overrideRepository.existsById(5L)).thenReturn(true);

        service.deleteScheduleOverride(5L);

        verify(overrideRepository).deleteById(5L);
    }

    /* the student's list carries only date, times and type - no id and no teacher note */
    @Test
    void studentView_hidesTheTeachersNote() {
        ScheduleOverride existing = override(5L, OverrideType.BLOCK, 10, 11);
        existing.setNote("dentist appointment");
        when(overrideRepository.findAll()).thenReturn(List.of(existing));

        List<AvailabilityOverrideResponse> result = service.getAllScheduleOverridesForStudent();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(OverrideType.BLOCK);
        assertThat(result.get(0).toString()).doesNotContain("dentist");
    }
}
