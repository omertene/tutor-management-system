package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.model.Role;

// the logged in user, taken from the token
public record AuthenticatedUser(Long id, String email, Role role) {
}
