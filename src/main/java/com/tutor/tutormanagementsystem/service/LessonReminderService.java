package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

// everything about *when* a lesson reminder is due, split out of LessonService.
// booking/cancelling/completing a lesson and deciding when to email about it are
// unrelated concerns that just happened to share an entity, and keeping the quiet-hours
// rules next to the booking rules made LessonService the biggest file in the project.
//
// the JMS side (LessonReminderScheduler queues, LessonReminderListener sends) talks to
// this instead of LessonService now.
@Service
@RequiredArgsConstructor
public class LessonReminderService {

    private final LessonRepository lessonRepository;

    // reminders are never emailed between these hours - a 12-hours-before reminder for
    // a 09:00 lesson would otherwise land at 21:00 the night before, which is fine, but
    // an early-morning lesson would land in the middle of the night
    private static final LocalTime QUIET_HOURS_START = LocalTime.of(22, 0);
    private static final LocalTime QUIET_HOURS_END = LocalTime.of(8, 0);

    public List<Lesson> getLessonsAwaitingReminder(long hoursBefore) {
        LocalDateTime now = LocalDateTime.now();

        return lessonRepository.findAllByStatusAndReminderSentFalse(LessonStatus.SCHEDULED).stream()
                .filter(lesson -> {
                    LocalDateTime lessonStart = LocalDateTime.of(lesson.getDate(), lesson.getStartTime());
                    if (!lessonStart.isAfter(now)) {
                        return false; // lesson already started/passed - never remind
                    }

                    LocalDateTime reminderTime = clampOutOfQuietHours(lessonStart.minusHours(hoursBefore));

                    // due once "now" has reached the (possibly clamped) reminder time,
                    // but only if the lesson hasn't started yet by then
                    return !now.isBefore(reminderTime);
                })
                .toList();
    }

    // if the given time falls inside quiet hours (22:00-08:00), pushes it forward to
    // 08:00 the same morning (or the next morning, if it was already past midnight)
    private LocalDateTime clampOutOfQuietHours(LocalDateTime time) {
        LocalTime timeOfDay = time.toLocalTime();

        boolean isDuringQuietHours = timeOfDay.isAfter(QUIET_HOURS_START) || timeOfDay.isBefore(QUIET_HOURS_END);

        if (!isDuringQuietHours) {
            return time;
        }


        LocalDate clampedDate = timeOfDay.isBefore(QUIET_HOURS_END) ? time.toLocalDate() : time.toLocalDate().plusDays(1);

        return LocalDateTime.of(clampedDate, QUIET_HOURS_END);
    }

    // marks a lesson as reminded so the next scheduled check doesn't pick it up again
    @Transactional
    public void markReminderSent(Lesson lesson) {
        lesson.setReminderSent(true);
        lessonRepository.save(lesson);
    }
}
