package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.ScheduleOverrideRequest;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideResponse;
import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;
import com.tutor.tutormanagementsystem.exception.PastDateException;
import com.tutor.tutormanagementsystem.exception.ScheduleConflictException;
import com.tutor.tutormanagementsystem.exception.ScheduleOverrideNotFoundException;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleOverrideService {

    private final ScheduleOverrideRepository scheduleOverrideRepository;

    public ScheduleOverrideResponse createScheduleOverride(ScheduleOverrideRequest request) {

        if (request.date().isBefore(LocalDate.now())) {
            throw new PastDateException("Cannot create an override for a past date");
        }

        if (request.startTime().isAfter(request.endTime())) {
            throw new InvalidTimeRangeException("Start time must be before end time");
        }

        List<ScheduleOverride> overlapping = scheduleOverrideRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(
                        request.date(), request.endTime(), request.startTime());

        if (!overlapping.isEmpty()) {
            throw new ScheduleConflictException("This time overlaps an existing override");
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

    public List<ScheduleOverrideResponse> getAllScheduleOverrides() {
        return scheduleOverrideRepository.findAll().stream()
                .map(o -> new ScheduleOverrideResponse(o.getId(), o.getDate(), o.getStartTime(),
                        o.getEndTime(), o.getType(), o.getNote()))
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
    public void deleteScheduleOverride(Long overrideId) {
        if (!scheduleOverrideRepository.existsById(overrideId)) {
            throw new ScheduleOverrideNotFoundException("Schedule override not found");
        }

        scheduleOverrideRepository.deleteById(overrideId);
    }
}
