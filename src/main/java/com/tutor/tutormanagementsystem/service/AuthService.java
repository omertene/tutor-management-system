package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.config.DemoMode;
import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.dto.LoginResponse;
import com.tutor.tutormanagementsystem.exception.InvalidCredentialsException;
import com.tutor.tutormanagementsystem.exception.DemoModeException;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import com.tutor.tutormanagementsystem.security.JwtService;
import com.tutor.tutormanagementsystem.security.LoginRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/* Handles public authentication and login. Isolated from UserService to manage
   anonymous login requests, rate limiting (brute-force defense), and JWT token creation. */

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;
    private final DemoMode demoMode;

    /* Authenticates user credentials, applies brute-force lockout rules, and issues a JWT token */
    public LoginResponse login(LoginRequest request) {
        // Reject missing or blank input early before hitting DB or rate limiter
        if (request.email() == null || request.email().isBlank() || request.password() == null) {
            throw new InvalidCredentialsException("Invalid email or password");
        }
        // Block request if this email had too many recent failed attempts (Brute Force defense)
        loginRateLimiter.checkNotLocked(request.email());

        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> {
                    loginRateLimiter.recordFailedAttempt(request.email());
                    return new InvalidCredentialsException("Invalid email or password");
                });

        // Compare raw password against hashed password in DB
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            loginRateLimiter.recordFailedAttempt(request.email());
            throw new InvalidCredentialsException("Invalid email or password");
        }

        // Reset lockout counter on successful authentication
        loginRateLimiter.recordSuccessfulLogin(request.email());

        // Issue stateless JWT token with user identity and role
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        return new LoginResponse(token, user.getId(), user.getEmail(), user.getRole());
    }

    /* Demo mode only: issues a token for the (single) teacher account with no password,
       so the "Try demo" button can sign a visitor straight in. Answers 404 when demo mode is off. */
    public LoginResponse demoTeacherLogin() {
        demoMode.requireEnabled();

        User teacher = userRepository.findFirstByRole(Role.TEACHER)
                .orElseThrow(() -> new DemoModeException("Not found", HttpStatus.NOT_FOUND));

        String token = jwtService.generateToken(teacher.getId(), teacher.getEmail(), teacher.getRole());
        return new LoginResponse(token, teacher.getId(), teacher.getEmail(), teacher.getRole());
    }
}
