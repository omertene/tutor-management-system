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

/* Handles logic for finding upcoming lessons that need email reminders.
   Includes quiet-hours rules so students don't get emails late at night. */
@Service
@RequiredArgsConstructor
public class LessonReminderService {

    private final LessonRepository lessonRepository;

    /* Do not send reminder emails between 22:00 and 08:00 */
    private static final LocalTime QUIET_HOURS_START = LocalTime.of(22, 0);
    private static final LocalTime QUIET_HOURS_END = LocalTime.of(8, 0);

    /* Finds all scheduled lessons that are due for a reminder right now */
    public List<Lesson> getLessonsAwaitingReminder(long hoursBefore) {
        LocalDateTime now = LocalDateTime.now();

        /* Get active scheduled lessons that haven't received a reminder yet */
        return lessonRepository.findAllByStatusAndReminderSentFalse(LessonStatus.SCHEDULED).stream()
                .filter(lesson -> {
                    LocalDateTime lessonStart = LocalDateTime.of(lesson.getDate(), lesson.getStartTime());

                    /* Skip past or already started lessons */
                    if (!lessonStart.isAfter(now)) {
                        return false;
                    }

                    /* Calculate target reminder time and push it forward if it hits quiet hours */
                    LocalDateTime reminderTime = clampOutOfQuietHours(lessonStart.minusHours(hoursBefore));

                    /* Ready to send if current time has reached or passed the target reminder time */
                    return !now.isBefore(reminderTime);
                })
                .toList();
    }

    /* If a reminder time falls inside 22:00-08:00, moves it to 08:00 in the morning */
    private LocalDateTime clampOutOfQuietHours(LocalDateTime time) {
        LocalTime timeOfDay = time.toLocalTime();

        boolean isDuringQuietHours = timeOfDay.isAfter(QUIET_HOURS_START) || timeOfDay.isBefore(QUIET_HOURS_END);

        if (!isDuringQuietHours) {
            return time;
        }

        /* If after midnight use same date at 08:00, if before midnight roll over to tomorrow at 08:00 */
        LocalDate clampedDate = timeOfDay.isBefore(QUIET_HOURS_END) ? time.toLocalDate() : time.toLocalDate().plusDays(1);

        return LocalDateTime.of(clampedDate, QUIET_HOURS_END);
    }

    /* Flags lesson as reminded to avoid sending duplicate emails in future scheduler runs */
    @Transactional
    public void markReminderSent(Lesson lesson) {
        lesson.setReminderSent(true);
        lessonRepository.save(lesson);
    }
}
