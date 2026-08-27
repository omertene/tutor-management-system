package com.tutor.tutormanagementsystem.dto;

/* Request for the logged-in user to change their own password */
public record ResetOwnPasswordRequest(String newPassword) {
}
