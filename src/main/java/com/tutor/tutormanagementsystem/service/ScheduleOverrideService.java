package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.AvailabilityOverrideResponse;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideResponse;
import com.tutor.tutormanagementsystem.exception.PastDateException;
import com.tutor.tutormanagementsystem.exception.ScheduleConflictException;
import com.tutor.tutormanagementsystem.exception.ScheduleOverrideNotFoundException;
import com.tutor.tutormanagementsystem.model.OverrideType;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;


/* Service for managing teacher schedule overrides (blocking times or opening extra availability) */

@Service
@RequiredArgsConstructor
public class ScheduleOverrideService {

    private final ScheduleOverrideRepository scheduleOverrideRepository;
    private final ScheduleRuleRepository scheduleRuleRepository;
    private final LessonService lessonService;


    /* Creates a new schedule override (block or add) after validating slot availability and locking the date */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ScheduleOverrideResponse createScheduleOverride(ScheduleOverrideRequest request) {

        /* Run validations, acquire mutex date lock, and verify no conflicts exist */
        requireWritableSlot(request, null, "Cannot create an override for a past date");

        ScheduleOverride scheduleOverride = ScheduleOverride.builder()
                .date(request.date())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .type(request.type())
                .note(request.note())
                .build();

        scheduleOverrideRepository.save(scheduleOverride);

        return toResponse(scheduleOverride);
    }


    /* Updates an existing schedule override after validating changes and resolving overlaps */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ScheduleOverrideResponse updateScheduleOverride(Long overrideId, ScheduleOverrideRequest request) {

        ScheduleOverride scheduleOverride = scheduleOverrideRepository.findById(overrideId)
                .orElseThrow(() -> new ScheduleOverrideNotFoundException("Schedule override not found"));

        /* Validate new slot constraints while excluding the current override from self-overlap */
        requireWritableSlot(request, overrideId, "Cannot move an override to a past date");

        scheduleOverride.setDate(request.date());
        scheduleOverride.setStartTime(request.startTime());
        scheduleOverride.setEndTime(request.endTime());
        scheduleOverride.setType(request.type());
        scheduleOverride.setNote(request.note());

        scheduleOverrideRepository.save(scheduleOverride);

        return toResponse(scheduleOverride);
    }


    /* Validates slot rules, acquires date mutex lock, and prevents conflicting schedule states */
    private void requireWritableSlot(ScheduleOverrideRequest request, Long excludeOverrideId, String pastDateMessage) {

        /* Disallow operations on past dates */
        if (request.date().isBefore(LocalDate.now())) {
            throw new PastDateException(pastDateMessage);
        }

        /* Validate that start time is strictly before end time */
        TimeValidation.requireValidRange(request.startTime(), request.endTime());

        /* Acquire exclusive date lock to prevent concurrent write race conditions */
        scheduleOverrideRepository.acquireDateLock(request.date().toEpochDay());

        /* Verify no overlap with existing overrides (ignoring current override if editing) */
        boolean overlapping = scheduleOverrideRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.date(), request.endTime(), request.startTime())
                .stream()
                .anyMatch(other -> !other.getId().equals(excludeOverrideId));

        if (overlapping) {
            throw new ScheduleConflictException("This time overlaps an existing override");
        }

        /* Check if the slot is already covered by a recurring weekly rule */
        boolean coveredByRule = !scheduleRuleRepository
                .findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.date().getDayOfWeek(), request.endTime(), request.startTime())
                .isEmpty();

        /* Block redundant states*/
        if (request.type() == OverrideType.BLOCK && !coveredByRule) {
            throw new ScheduleConflictException("This time is already unavailable - no need to block it");
        }
        if (request.type() == OverrideType.ADD && coveredByRule) {
            throw new ScheduleConflictException("This time is already available - no need to add it");
        }

        /* Prevent blocking hours that currently have an active booked lesson */
        if (request.type() == OverrideType.BLOCK
                && lessonService.hasScheduledLessonInRange(request.date(), request.startTime(), request.endTime())) {
            throw new ScheduleConflictException("This time has a scheduled lesson - cancel it before blocking this time");
        }
    }

    /* Maps ScheduleOverride entity to full ScheduleOverrideResponse DTO */
    private ScheduleOverrideResponse toResponse(ScheduleOverride scheduleOverride) {
        return new ScheduleOverrideResponse(scheduleOverride.getId(), scheduleOverride.getDate(),
                scheduleOverride.getStartTime(), scheduleOverride.getEndTime(),
                scheduleOverride.getType(), scheduleOverride.getNote());
    }

    /* Returns all schedule overrides for the teacher's schedule view */
    public List<ScheduleOverrideResponse> getAllScheduleOverrides() {
        return scheduleOverrideRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /* Returns sanitized schedule overrides for students without exposing internal IDs or teacher notes */
    public List<AvailabilityOverrideResponse> getAllScheduleOverridesForStudent() {
        return scheduleOverrideRepository.findAll().stream()
                .map(o -> new AvailabilityOverrideResponse(o.getDate(), o.getStartTime(), o.getEndTime(), o.getType()))
                .toList();
    }

    /* Returns all overrides defined for a specific date */
    public List<ScheduleOverrideResponse> getOverridesForDate(LocalDate date) {
        return scheduleOverrideRepository.findAllByDate(date).stream()
                .map(this::toResponse)
                .toList();
    }

    /* Permanently deletes an override */
    @Transactional
    public void deleteScheduleOverride(Long overrideId) {
        if (!scheduleOverrideRepository.existsById(overrideId)) {
            throw new ScheduleOverrideNotFoundException("Schedule override not found");
        }

        scheduleOverrideRepository.deleteById(overrideId);
    }
}
