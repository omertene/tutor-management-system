package com.tutor.tutormanagementsystem.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/* sends the "reset your password" email. kept separate from PasswordResetService so the
   send can run in the background (@Async): the request then answers at the same speed whether
   or not the email exists, so response time can't be used to find out who is registered.
   a failed send is only logged - the caller gets the same answer either way. */

@Component
@RequiredArgsConstructor
public class PasswordResetMailer {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final EmailService emailService;

    /* public address of the site, used to build the link. optional: when empty we fall back
       to the first allowed CORS origin, which is already the real frontend address */
    @Value("${app.frontend-url:}")
    private String frontendUrl;

    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String corsOrigins;

    /* emails a one-time reset link. runs on a background thread */
    @Async
    public void sendResetLink(String to, String token) {
        String link = baseUrl() + "/reset-password?token=" + token;
        String body = "שלום,\n\n"
                + "התקבלה בקשה לאיפוס הסיסמה שלך ב-TutorHub.\n"
                + "כדי לבחור סיסמה חדשה היכנסו לקישור (הוא תקף לשעה אחת):\n\n"
                + link + "\n\n"
                + "אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מההודעה הזו.\n";
        try {
            emailService.sendEmail(to, "איפוס סיסמה ל-TutorHub", body);
        } catch (Exception e) {
            // never log the link or token, they are credentials
            log.warn("Could not send a password reset email", e);
        }
    }

    /* site address without a trailing slash */
    private String baseUrl() {
        String base = (frontendUrl == null || frontendUrl.isBlank())
                ? corsOrigins.split(",")[0]
                : frontendUrl;
        base = base.trim();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }
}
