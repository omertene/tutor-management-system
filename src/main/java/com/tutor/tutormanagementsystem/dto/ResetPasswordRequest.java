package com.tutor.tutormanagementsystem.dto;

/* Request from the reset page: the token from the emailed link plus the new password */
public record ResetPasswordRequest(String token, String newPassword) {
}
