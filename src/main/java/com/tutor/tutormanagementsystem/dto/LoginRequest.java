package com.tutor.tutormanagementsystem.dto;

/* What the client sends us to log in */
public record LoginRequest(String email, String password) {
}
