package com.tutor.tutormanagementsystem.dto;

// the logged-in user's own account info, returned after a self-service email/
// password change so the frontend can update what it shows without a re-fetch
public record UserResponse(Long id, String email, String firstName, String lastName) {
}
