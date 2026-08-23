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

@Service
@RequiredArgsConstructor
public class ScheduleOverrideService {

    private final ScheduleOverrideRepository scheduleOverrideRepository;
    private final ScheduleRuleRepository scheduleRuleRepository;
    private final LessonService lessonService;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ScheduleOverrideResponse createScheduleOverride(ScheduleOverrideRequest request) {

        if (request.date().isBefore(LocalDate.now())) {
            throw new PastDateException("Cannot create an override for a past date");
        }

        TimeValidation.requireValidRange(request.startTime(), request.endTime());

        // taken before any of the checks below, for the same reason LessonService takes
        // it before its availability check: everything from here to the save is a
        // check-then-act sequence, and without the lock two concurrent writes on this
        // date can both pass the checks and both insert
        scheduleOverrideRepository.acquireDateLock(request.date().toEpochDay());

        List<ScheduleOverride> overlapping = scheduleOverrideRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.date(), request.endTime(), request.startTime());

        if (!overlapping.isEmpty()) {
            throw new ScheduleConflictException("This time overlaps an existing override");
        }

        boolean coveredByRule = !scheduleRuleRepository
                .findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.date().getDayOfWeek(), request.endTime(), request.startTime())
                .isEmpty();

        if (request.type() == OverrideType.BLOCK && !coveredByRule) {
            throw new ScheduleConflictException("This time is already unavailable - no need to block it");
        }

        if (request.type() == OverrideType.ADD && coveredByRule) {
            throw new ScheduleConflictException("This time is already available - no need to add it");
        }

        if (request.type() == OverrideType.BLOCK
                && lessonService.hasScheduledLessonInRange(request.date(), request.startTime(), request.endTime())) {
            throw new ScheduleConflictException("This time has a scheduled lesson - cancel it before blocking this time");
        }

        ScheduleOverride scheduleOverride = ScheduleOverride.builder()
                .date(request.date())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .type(request.type())
                .note(request.note())
                .build();

        scheduleOverrideRepository.save(scheduleOverride);

        return new ScheduleOverrideResponse(scheduleOverride.getId(), scheduleOverride.getDate(),
                scheduleOverride.getStartTime(), scheduleOverride.getEndTime(),
                scheduleOverride.getType(), scheduleOverride.getNote());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ScheduleOverrideResponse updateScheduleOverride(Long overrideId, ScheduleOverrideRequest request) {
        ScheduleOverride scheduleOverride = scheduleOverrideRepository.findById(overrideId)
                .orElseThrow(() -> new ScheduleOverrideNotFoundException("Schedule override not found"));

        if (request.date().isBefore(LocalDate.now())) {
            throw new PastDateException("Cannot move an override to a past date");
        }

        TimeValidation.requireValidRange(request.startTime(), request.endTime());

        scheduleOverrideRepository.acquireDateLock(request.date().toEpochDay());

        boolean overlapping = scheduleOverrideRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.date(), request.endTime(), request.startTime())
                .stream()
                .anyMatch(other -> !other.getId().equals(overrideId));

        if (overlapping) {
            throw new ScheduleConflictException("This time overlaps an existing override");
        }

        boolean coveredByRule = !scheduleRuleRepository
                .findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.date().getDayOfWeek(), request.endTime(), request.startTime())
                .isEmpty();

        if (request.type() == OverrideType.BLOCK && !coveredByRule) {
            throw new ScheduleConflictException("This time is already unavailable - no need to block it");
        }

        if (request.type() == OverrideType.ADD && coveredByRule) {
            throw new ScheduleConflictException("This time is already available - no need to add it");
        }

        if (request.type() == OverrideType.BLOCK
                && lessonService.hasScheduledLessonInRange(request.date(), request.startTime(), request.endTime())) {
            throw new ScheduleConflictException("This time has a scheduled lesson - cancel it before blocking this time");
        }

        scheduleOverride.setDate(request.date());
        scheduleOverride.setStartTime(request.startTime());
        scheduleOverride.setEndTime(request.endTime());
        scheduleOverride.setType(request.type());
        scheduleOverride.setNote(request.note());

        scheduleOverrideRepository.save(scheduleOverride);

        return new ScheduleOverrideResponse(scheduleOverride.getId(), scheduleOverride.getDate(),
                scheduleOverride.getStartTime(), scheduleOverride.getEndTime(),
                scheduleOverride.getType(), scheduleOverride.getNote());
    }

    public List<ScheduleOverrideResponse> getAllScheduleOverrides() {
        return scheduleOverrideRepository.findAll().stream()
                .map(o -> new ScheduleOverrideResponse(o.getId(), o.getDate(), o.getStartTime(),
                        o.getEndTime(), o.getType(), o.getNote()))
                .toList();
    }

    // student-facing: same rows as getAllScheduleOverrides, but with the id and
    // teacher's private note stripped out - only date/time/type reach the student
    public List<AvailabilityOverrideResponse> getAllScheduleOverridesForStudent() {
        return scheduleOverrideRepository.findAll().stream()
                .map(o -> new AvailabilityOverrideResponse(o.getDate(), o.getStartTime(), o.getEndTime(), o.getType()))
                .toList();
    }

    public List<ScheduleOverrideResponse> getOverridesForDate(LocalDate date) {
        return scheduleOverrideRepository.findAllByDate(date).stream()
                .map(o -> new ScheduleOverrideResponse(o.getId(), o.getDate(), o.getStartTime(),
                        o.getEndTime(), o.getType(), o.getNote()))
                .toList();
    }

    // undoes a mistaken override (e.g. blocked the wrong day). nothing else
    // references a ScheduleOverride by FK, so this is a plain delete, no guard needed
    @Transactional
    public void deleteScheduleOverride(Long overrideId) {
        if (!scheduleOverrideRepository.existsById(overrideId)) {
            throw new ScheduleOverrideNotFoundException("Schedule override not found");
        }

        scheduleOverrideRepository.deleteById(overrideId);
    }
}
