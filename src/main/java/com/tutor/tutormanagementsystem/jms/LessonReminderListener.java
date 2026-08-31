package com.tutor.tutormanagementsystem.jms;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.service.EmailService;
import com.tutor.tutormanagementsystem.service.LessonReminderService;
import com.tutor.tutormanagementsystem.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

/* consumer side of the reminder flow - picks lesson IDs off the queue
   (LessonReminderScheduler is the producer) and sends the actual email */
@Component
@RequiredArgsConstructor
public class LessonReminderListener {

    private final LessonService lessonService;
    private final LessonReminderService lessonReminderService;
    private final EmailService emailService;

    private static final Logger log = LoggerFactory.getLogger(LessonReminderListener.class);

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    /* sends the reminder email for one lesson. wrapped in try/catch so a failure
       doesn't get redelivered forever - it's just logged, and the lesson stays
       reminderSent=false to get picked up on the next scheduler run */
    @JmsListener(destination = JmsQueues.LESSON_REMINDER_QUEUE)
    public void onLessonReminder(Long lessonId) {
        try {
            /* re-fetch fresh, could be stale since it was queued */
            Lesson lesson = lessonService.getLessonEntity(lessonId);

            if (lesson.isReminderSent() || lesson.getStatus() != LessonStatus.SCHEDULED) {
                return; /* already reminded, or cancelled since this was queued */
            }

            String to = lesson.getStudent().getUser().getEmail();
            String studentFirstName = lesson.getStudent().getUser().getFirstName();
            String subjectName = lesson.getSubject().getName();
            String date = lesson.getDate().format(DATE_FORMAT);
            String startTime = lesson.getStartTime().format(TIME_FORMAT);
            String endTime = lesson.getEndTime().format(TIME_FORMAT);

            String subject = "Reminder: your upcoming lesson";
            String body = "Hi " + studentFirstName + ",\n\n"
                    + "This is a reminder that you have a " + subjectName + " lesson on "
                    + date + " at " + startTime + "-" + endTime + ".";

            emailService.sendEmail(to, subject, body);

            /* only mark sent after the send succeeds, so a failure is retried later */
            lessonReminderService.markReminderSent(lesson);
        } catch (Exception e) {
            log.error("Failed to send lesson reminder for lesson {}", lessonId, e);
        }
    }
}
