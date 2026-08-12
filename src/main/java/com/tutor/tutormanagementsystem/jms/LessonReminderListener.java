package com.tutor.tutormanagementsystem.jms;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.service.EmailService;
import com.tutor.tutormanagementsystem.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;


@Component
@RequiredArgsConstructor
public class LessonReminderListener {

    private final LessonService lessonService;
    private final EmailService emailService;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    @JmsListener(destination = JmsQueues.LESSON_REMINDER_QUEUE)
    public void onLessonReminder(Long lessonId) {
        Lesson lesson = lessonService.getLessonEntity(lessonId);

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
    }
}
