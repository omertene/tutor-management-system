package com.tutor.tutormanagementsystem.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/* Low-level infrastructure service wrapping Spring JavaMailSender.
   Decoupled from specific domain events to allow reusable plain-text email delivery across the system. */

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    /* Builds and sends a simple text email */
    public void sendEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
