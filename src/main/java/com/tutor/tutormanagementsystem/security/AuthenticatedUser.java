package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.model.Role;

/* the logged in user, built from the JWT claims - used as the auth principal */
public record AuthenticatedUser(Long id, String email, Role role) {
}
