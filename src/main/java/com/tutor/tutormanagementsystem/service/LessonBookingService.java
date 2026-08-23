package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.dto.LessonResponse;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideRequest;
import com.tutor.tutormanagementsystem.model.OverrideType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LessonBookingService {

    private final LessonService lessonService;
    private final ScheduleOverrideService scheduleOverrideService;

    // the ADD override has to be created BEFORE the lesson, not after: booking goes
    // through AvailabilityService.isTimeAvailable, which only returns true if a rule
    // or an existing ADD override covers the slot. outside regular hours neither is
    // true yet, so booking first always fails with "This time is not available".
    // creating the override first is safe here precisely because both writes share
    // one transaction - if the booking then fails for any reason, the override is
    // rolled back with it and no orphan availability window is left behind
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonOutsideHours(LessonRequest request) {
        scheduleOverrideService.createScheduleOverride(new ScheduleOverrideRequest(
                request.date(), request.startTime(), request.endTime(),
                OverrideType.ADD, "Lesson booked outside regular hours"));

        return lessonService.createLessonForStudent(request);
    }
}
