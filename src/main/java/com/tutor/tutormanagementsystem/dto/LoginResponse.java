package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.Role;

/* What we send back after a successful login */
public record LoginResponse(String token, Long userId, String email, Role role) {
}
