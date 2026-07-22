package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.model.OverrideType;
import com.tutor.tutormanagementsystem.model.ScheduleSlot;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
public class AvailabilityService {

    private final ScheduleSlotRepository scheduleRepo;
    private final ScheduleOverrideRepository overrideRepo;


    public boolean isAvailable(LocalDate date, LocalTime startTime, LocalTime endTime) {
        List<ScheduleOverride> overrides = overrideRepo.findByDate(date);

        boolean isBlocked = overrides.stream()
                .filter(o -> o.getOverrideType() == OverrideType.BLOCKED)
                .anyMatch(o -> overlaps(startTime, endTime, o.getStartTime(), o.getEndTime()));
        if (isBlocked) {
            return false;
        }

        boolean coveredByOpenOverride = overrides.stream()
                .filter(o -> o.getOverrideType() == OverrideType.OPEN)
                .anyMatch(o -> contains(o.getStartTime(), o.getEndTime(), startTime, endTime));
        if (coveredByOpenOverride) {
            return checkNoLessonConflict(date, startTime, endTime);
        }

        List<ScheduleSlot> rules = scheduleRepo.findByDayOfWeek(date.getDayOfWeek());
        boolean coveredByRule = rules.stream()
                .anyMatch(r -> contains(r.getStartTime(), r.getEndTime(), startTime, endTime));

        return coveredByRule && checkNoLessonConflict(date, startTime, endTime);
    }


    public List<FreeSlot> getFreeSlotsForWeek(LocalDate weekStart) {
        List<FreeSlot> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day = weekStart.plusDays(i);
            result.addAll(getFreeSlotsForDay(day));
        }
        return result;
    }

    public List<FreeSlot> getFreeSlotsForDay(LocalDate date) {
        List<ScheduleOverride> overrides = overrideRepo.findByDate(date);
        List<ScheduleSlot> rules = scheduleRepo.findByDayOfWeek(date.getDayOfWeek());

        List<LocalTime[]> ranges = new ArrayList<>();
        for (ScheduleSlot r : rules) {
            ranges.add(new LocalTime[]{r.getStartTime(), r.getEndTime()});
        }

        for (ScheduleOverride o : overrides) {
            if (o.getOverrideType() == OverrideType.BLOCKED) {
                ranges = subtractRange(ranges, o.getStartTime(), o.getEndTime());
            } else if (o.getOverrideType() == OverrideType.OPEN) {
                ranges.add(new LocalTime[]{o.getStartTime(), o.getEndTime()});
            }
        }

        List<FreeSlot> freeSlots = new ArrayList<>();
        for (LocalTime[] range : ranges) {
            freeSlots.add(new FreeSlot(date, range[0], range[1]));
        }
        return freeSlots;
    }

    private List<LocalTime[]> subtractRange(List<LocalTime[]> ranges, LocalTime bStart, LocalTime bEnd) {
        List<LocalTime[]> result = new ArrayList<>();
        for (LocalTime[] range : ranges) {
            LocalTime start = range[0];
            LocalTime end = range[1];

            if (!overlaps(start, end, bStart, bEnd)) {
                result.add(range);
                continue;
            }
            if (start.isBefore(bStart)) {
                result.add(new LocalTime[]{start, bStart});
            }
            if (bEnd.isBefore(end)) {
                result.add(new LocalTime[]{bEnd, end});
            }
        }
        return result;
    }

    public record FreeSlot(LocalDate date, LocalTime startTime, LocalTime endTime) {}


    public ScheduleSlot createRule(ScheduleSlot rule) {
        validateRange(rule.getStartTime(), rule.getEndTime());

        boolean hasOverlap = scheduleRepo.findByDayOfWeek(rule.getDayOfWeek()).stream()
                .anyMatch(r -> overlaps(r.getStartTime(), r.getEndTime(), rule.getStartTime(), rule.getEndTime()));
        if (hasOverlap) {
            throw new RuntimeException("Rule overlaps an existing rule for " + rule.getDayOfWeek()); //לטפל בשגיאה
        }

        return scheduleRepo.save(rule);
    }

    public void deleteRule(UUID ruleId) {
        scheduleRepo.deleteById(ruleId);
    }

    public List<ScheduleSlot> getRulesForDay(DayOfWeek day) {
        return scheduleRepo.findByDayOfWeek(day);
    }


    public ScheduleOverride createOverride(ScheduleOverride override) {
        validateRange(override.getStartTime(), override.getEndTime());

        boolean hasOverlap = overrideRepo.findByDate(override.getDate()).stream()
                .anyMatch(o -> overlaps(o.getStartTime(), o.getEndTime(), override.getStartTime(), override.getEndTime()));
        if (hasOverlap) {
            throw new RuntimeException("Override overlaps an existing override on " + override.getDate()); // לטפל בשגיאה
        }

        return overrideRepo.save(override);
    }

    public void deleteOverride(UUID overrideId) {
        overrideRepo.deleteById(overrideId);
    }

    public List<ScheduleOverride> getOverridesForDate(LocalDate date) {
        return overrideRepo.findByDate(date);
    }


    private void validateRange(LocalTime start, LocalTime end) {
        if (!start.isBefore(end)) {
            throw new RuntimeException("startTime must be before endTime"); // לטפל בשגיאה
        }
    }

    private boolean overlaps(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    private boolean contains(LocalTime outerStart, LocalTime outerEnd, LocalTime innerStart, LocalTime innerEnd) {
        return !innerStart.isBefore(outerStart) && !innerEnd.isAfter(outerEnd);
    }

    private boolean checkNoLessonConflict(LocalDate date, LocalTime startTime, LocalTime endTime) {
        return true;
    }
}