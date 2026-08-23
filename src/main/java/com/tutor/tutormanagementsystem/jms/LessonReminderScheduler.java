package com.tutor.tutormanagementsystem.jms;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.service.LessonReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;


@Component
@RequiredArgsConstructor
public class LessonReminderScheduler {

    private final LessonReminderService lessonReminderService;
    private final JmsTemplate jmsTemplate;

    @Value("${reminder.hours-before}")
    private long hoursBefore;

    // only queues the reminder here - reminderSent is set by the listener, and only
    // after the email actually goes out (see LessonReminderListener). marking it here
    // would flag a lesson as reminded the instant the message is queued, regardless of
    // whether the send later succeeds - if SMTP is down when the listener runs, the
    // email is lost and this lesson would never be picked up again on a future run
    @Scheduled(fixedRate = 30 * 60 * 1000)
    public void checkForUpcomingLessons() {
        List<Lesson> dueForReminder = lessonReminderService.getLessonsAwaitingReminder(hoursBefore);

        for (Lesson lesson : dueForReminder) {
            jmsTemplate.convertAndSend(JmsQueues.LESSON_REMINDER_QUEUE, lesson.getId());
        }
    }
}
