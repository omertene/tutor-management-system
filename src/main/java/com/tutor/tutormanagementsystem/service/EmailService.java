package com.tutor.tutormanagementsystem.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/* Low-level infrastructure service for plain-text email delivery.
   If BREVO_API_KEY is set, mail goes out over Brevo's HTTPS API (works on hosts that block SMTP,
   like Render's free tier). Otherwise it falls back to SMTP through JavaMailSender (local dev).
   Throws on failure so callers can decide whether to retry. */

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final JavaMailSender mailSender;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${brevo.sender-email:}")
    private String brevoSenderEmail;

    @Value("${brevo.sender-name:TutorHub}")
    private String brevoSenderName;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /* Builds and sends a simple text email */
    public void sendEmail(String to, String subject, String body) {
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            sendViaBrevo(to, subject, body);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private void sendViaBrevo(String to, String subject, String body) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "sender", Map.of("name", brevoSenderName, "email", brevoSenderEmail),
                    "to", List.of(Map.of("email", to)),
                    "subject", subject,
                    "textContent", body));

            HttpRequest request = HttpRequest.newBuilder(URI.create(BREVO_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("api-key", brevoApiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new IllegalStateException("Brevo rejected the email: HTTP "
                        + response.statusCode() + " " + response.body());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while sending email", e);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Could not send email via Brevo", e);
        }
    }
}
