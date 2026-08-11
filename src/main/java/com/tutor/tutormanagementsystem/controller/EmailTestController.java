package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// TEMPORARY - only exists to manually verify the Gmail SMTP setup works before the
// real reminder-scheduling feature is built. Safe to delete once that's confirmed.
@RestController
@RequiredArgsConstructor
public class EmailTestController {

    private final EmailService emailService;

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/teacher/test-email")
    public ResponseEntity<String> sendTestEmail(@RequestParam String to) {
        emailService.sendEmail(to, "TutorHub test email", "If you're reading this, email sending works.");
        return ResponseEntity.ok("Sent to " + to);
    }
}
