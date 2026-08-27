package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.dto.LessonResponse;
import com.tutor.tutormanagementsystem.dto.ScheduleOverrideRequest;
import com.tutor.tutormanagementsystem.model.OverrideType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/* Service for booking lessons outside the tutor's normal working hours.
   Opens an ADD override first, then creates the lesson inside a single transaction. */

@Service
@RequiredArgsConstructor
public class LessonBookingService {

    private final LessonService lessonService;
    private final ScheduleOverrideService scheduleOverrideService;

    /* Books a custom lesson by opening an availability slot first and then inserting the lesson */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonOutsideHours(LessonRequest request) {
        /* Step 1: Open an ADD override slot so AvailabilityService won't reject the lesson */
        scheduleOverrideService.createScheduleOverride(new ScheduleOverrideRequest(
                request.date(), request.startTime(), request.endTime(),
                OverrideType.ADD, "Lesson booked outside regular hours"));
        /* Step 2: Book the lesson normally using the newly opened slot.
           If this fails, @Transactional rolls back Step 1 automatically. */
        return lessonService.createLessonForStudent(request);
    }
}
