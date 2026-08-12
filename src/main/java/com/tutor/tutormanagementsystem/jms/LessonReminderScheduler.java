package com.tutor.tutormanagementsystem.jms;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;


@Component
@RequiredArgsConstructor
public class LessonReminderScheduler {

    private final LessonService lessonService;
    private final JmsTemplate jmsTemplate;

    @Value("${reminder.hours-before}")
    private long hoursBefore;

    @Scheduled(fixedRate = 30 * 60 * 1000)
    public void checkForUpcomingLessons() {
        List<Lesson> dueForReminder = lessonService.getLessonsAwaitingReminder(hoursBefore);

        for (Lesson lesson : dueForReminder) {
            jmsTemplate.convertAndSend(JmsQueues.LESSON_REMINDER_QUEUE, lesson.getId());
            lessonService.markReminderSent(lesson);
        }
    }
}
