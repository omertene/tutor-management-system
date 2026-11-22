package com.tutor.tutormanagementsystem.dto;

/* Request from the "forgot password" form: the email the person logs in with */
public record ForgotPasswordRequest(String email) {
}
