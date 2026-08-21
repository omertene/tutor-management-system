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

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonOutsideHours(LessonRequest request) {
        LessonResponse lesson = lessonService.createLessonForStudent(request);

        scheduleOverrideService.createScheduleOverride(new ScheduleOverrideRequest(
                request.date(), request.startTime(), request.endTime(),
                OverrideType.ADD, "Lesson booked outside regular hours"));

        return lesson;
    }
}
