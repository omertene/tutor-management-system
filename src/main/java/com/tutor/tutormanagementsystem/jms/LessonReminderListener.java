package com.tutor.tutormanagementsystem.jms;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.service.EmailService;
import com.tutor.tutormanagementsystem.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;


@Component
@RequiredArgsConstructor
public class LessonReminderListener {

    private final LessonService lessonService;
    private final EmailService emailService;

    private static final Logger log = LoggerFactory.getLogger(LessonReminderListener.class);

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    // reminderSent is only set here, after a successful send - not by the scheduler at
    // queue time (see LessonReminderScheduler). that means the same lesson could in
    // principle be queued twice if a listener run is still in flight when the next
    // scheduler tick fires, so this re-checks reminderSent/status itself before sending
    // rather than trusting that queuing it implies it's safe to send.
    //
    // this whole method is wrapped in a try/catch on purpose: a JMS listener that lets
    // an exception escape gets the message redelivered by the broker and throws again,
    // forever, on every lesson this fails for (a "poison message"). since there's no
    // redelivery-limit configured on the embedded broker, catching everything here and
    // logging instead is what actually stops that loop - a lesson whose reminder failed
    // to send just stays reminderSent=false and gets picked up again on the next
    // scheduler run (30 min later), which is the right outcome for a transient failure
    // like SMTP being down.
    @JmsListener(destination = JmsQueues.LESSON_REMINDER_QUEUE)
    public void onLessonReminder(Long lessonId) {
        try {
            Lesson lesson = lessonService.getLessonEntity(lessonId);

            if (lesson.isReminderSent() || lesson.getStatus() != LessonStatus.SCHEDULED) {
                return; // already reminded, or cancelled since this was queued - nothing to do
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

            lessonService.markReminderSent(lesson);
        } catch (Exception e) {
            log.error("Failed to send lesson reminder for lesson {}", lessonId, e);
        }
    }
}
