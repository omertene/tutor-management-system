package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.ScheduleRuleRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleRuleResponse;
import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;
import com.tutor.tutormanagementsystem.exception.ScheduleConflictException;
import com.tutor.tutormanagementsystem.exception.ScheduleRuleNotFoundException;
import com.tutor.tutormanagementsystem.model.ScheduleRule;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
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

/* unit test of the weekly availability rules: no overlapping rules on the same day,
   time validation, and what happens on update and delete. Fake repository, no database. */

@ExtendWith(MockitoExtension.class)
class ScheduleRuleServiceTest {

    @Mock
    private ScheduleRuleRepository ruleRepository;

    @Mock
    private LessonService lessonService;

    @InjectMocks
    private ScheduleRuleService service;

    private ScheduleRuleRequest request(DayOfWeek day, int fromHour, int toHour) {
        return new ScheduleRuleRequest(day, LocalTime.of(fromHour, 0), LocalTime.of(toHour, 0));
    }

    private ScheduleRule rule(Long id, DayOfWeek day, int fromHour, int toHour) {
        return ScheduleRule.builder().id(id).dayOfWeek(day)
                .startTime(LocalTime.of(fromHour, 0)).endTime(LocalTime.of(toHour, 0)).build();
    }

    private void givenOverlappingRules(ScheduleRule... rules) {
        when(ruleRepository.findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(any(), any(), any()))
                .thenReturn(List.of(rules));
    }

    /* ---------- create ---------- */

    @Test
    void createRule_withNoOverlap_savesAndReturnsIt() {
        givenOverlappingRules();

        ScheduleRuleResponse response = service.createScheduleRule(request(DayOfWeek.SUNDAY, 10, 14));

        assertThat(response.dayOfWeek()).isEqualTo(DayOfWeek.SUNDAY);
        assertThat(response.startTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(response.endTime()).isEqualTo(LocalTime.of(14, 0));
        verify(ruleRepository).save(any(ScheduleRule.class));
    }

    @Test
    void createRule_overlappingAnExistingRule_isRejected() {
        givenOverlappingRules(rule(1L, DayOfWeek.SUNDAY, 12, 16));

        assertThatThrownBy(() -> service.createScheduleRule(request(DayOfWeek.SUNDAY, 10, 14)))
                .isInstanceOf(ScheduleConflictException.class);
        verify(ruleRepository, never()).save(any());
    }

    @Test
    void createRule_withInvalidTimes_isRejectedBeforeLookingForOverlaps() {
        assertThatThrownBy(() -> service.createScheduleRule(request(DayOfWeek.SUNDAY, 14, 10)))
                .isInstanceOf(InvalidTimeRangeException.class);
        verify(ruleRepository, never()).save(any());
    }

    /* ---------- update ---------- */

    @Test
    void updateRule_unknownId_throwsNotFound() {
        when(ruleRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateScheduleRule(5L, request(DayOfWeek.MONDAY, 9, 12)))
                .isInstanceOf(ScheduleRuleNotFoundException.class);
    }

    @Test
    void updateRule_changesTheFieldsAndSaves() {
        ScheduleRule existing = rule(5L, DayOfWeek.SUNDAY, 10, 14);
        when(ruleRepository.findById(5L)).thenReturn(Optional.of(existing));
        givenOverlappingRules();

        ScheduleRuleResponse response = service.updateScheduleRule(5L, request(DayOfWeek.MONDAY, 9, 12));

        assertThat(response.dayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(existing.getStartTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(existing.getEndTime()).isEqualTo(LocalTime.of(12, 0));
        verify(ruleRepository).save(existing);
    }

    /* a rule is allowed to overlap its own old time - only other rules count as a conflict */
    @Test
    void updateRule_overlappingOnlyItself_isAllowed() {
        ScheduleRule existing = rule(5L, DayOfWeek.SUNDAY, 10, 14);
        when(ruleRepository.findById(5L)).thenReturn(Optional.of(existing));
        givenOverlappingRules(existing);

        assertThatCode(() -> service.updateScheduleRule(5L, request(DayOfWeek.SUNDAY, 11, 15)))
                .doesNotThrowAnyException();
    }

    @Test
    void updateRule_overlappingAnotherRule_isRejected() {
        ScheduleRule existing = rule(5L, DayOfWeek.SUNDAY, 10, 14);
        when(ruleRepository.findById(5L)).thenReturn(Optional.of(existing));
        givenOverlappingRules(rule(6L, DayOfWeek.SUNDAY, 14, 18));

        assertThatThrownBy(() -> service.updateScheduleRule(5L, request(DayOfWeek.SUNDAY, 13, 17)))
                .isInstanceOf(ScheduleConflictException.class);
        verify(ruleRepository, never()).save(any());
    }

    /* ---------- delete ---------- */

    @Test
    void deleteRule_unknownId_throwsNotFoundAndDeletesNothing() {
        when(ruleRepository.existsById(5L)).thenReturn(false);

        assertThatThrownBy(() -> service.deleteScheduleRule(5L))
                .isInstanceOf(ScheduleRuleNotFoundException.class);
        verify(ruleRepository, never()).deleteById(any());
    }

    @Test
    void deleteRule_existingId_deletesIt() {
        when(ruleRepository.existsById(5L)).thenReturn(true);

        service.deleteScheduleRule(5L);

        verify(ruleRepository).deleteById(5L);
    }

    /* ---------- the "how many lessons are affected" warnings ---------- */

    @Test
    void lessonsAffectedByDeletion_asksTheLessonServiceAboutTheRulesWeeklySlot() {
        when(ruleRepository.findById(5L)).thenReturn(Optional.of(rule(5L, DayOfWeek.SUNDAY, 10, 14)));
        when(lessonService.countUpcomingLessonsInWeeklySlot(
                DayOfWeek.SUNDAY, LocalTime.of(10, 0), LocalTime.of(14, 0))).thenReturn(3L);

        assertThat(service.countUpcomingLessonsAffectedByDeletion(5L)).isEqualTo(3L);
    }

    @Test
    void lessonsAffectedByEdit_passesBothTheOldAndTheNewTimes() {
        when(ruleRepository.findById(5L)).thenReturn(Optional.of(rule(5L, DayOfWeek.SUNDAY, 10, 14)));
        when(lessonService.countUpcomingLessonsLosingCoverage(
                DayOfWeek.SUNDAY, LocalTime.of(10, 0), LocalTime.of(14, 0),
                DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(12, 0))).thenReturn(2L);

        assertThat(service.countUpcomingLessonsAffectedByEdit(5L, request(DayOfWeek.MONDAY, 9, 12)))
                .isEqualTo(2L);
    }

    @Test
    void lessonsAffectedByDeletion_unknownRule_throwsNotFound() {
        when(ruleRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.countUpcomingLessonsAffectedByDeletion(5L))
                .isInstanceOf(ScheduleRuleNotFoundException.class);
    }
}
