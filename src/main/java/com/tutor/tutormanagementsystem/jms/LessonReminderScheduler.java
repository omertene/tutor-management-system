package com.tutor.tutormanagementsystem.jms;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.service.LessonReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/* producer side of the reminder flow - finds lessons due for a reminder and
   queues their IDs, doesn't send email itself */
@Component
@RequiredArgsConstructor
public class LessonReminderScheduler {

    private final LessonReminderService lessonReminderService;
    private final JmsTemplate jmsTemplate;

    @Value("${reminder.hours-before}")
    private long hoursBefore;

    /* runs every 30 minutes, queues one message per lesson that's within
       hoursBefore of starting and hasn't had its reminder sent yet */
    @Scheduled(fixedRate = 30 * 60 * 1000)
    public void checkForUpcomingLessons() {
        List<Lesson> dueForReminder = lessonReminderService.getLessonsAwaitingReminder(hoursBefore);

        for (Lesson lesson : dueForReminder) {
            /* only the ID goes on the queue - the listener re-fetches the full lesson */
            jmsTemplate.convertAndSend(JmsQueues.LESSON_REMINDER_QUEUE, lesson.getId());
        }
    }
}
