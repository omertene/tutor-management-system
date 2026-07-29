package com.tutor.tutormanagementsystem.dto;

// what the client sends us to log in
public record LoginRequest(String email, String password) {
}
