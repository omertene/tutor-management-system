package com.tutor.tutormanagementsystem.dto;

/* The logged-in user's own account info, returned after they change their
   email/password so the frontend can update without a re-fetch */
public record UserResponse(Long id, String email, String firstName, String lastName) {
}
