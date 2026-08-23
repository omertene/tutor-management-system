package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.dto.LoginResponse;
import com.tutor.tutormanagementsystem.exception.InvalidCredentialsException;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import com.tutor.tutormanagementsystem.security.JwtService;
import com.tutor.tutormanagementsystem.security.LoginRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;

    public LoginResponse login(LoginRequest request) {
        if (request.email() == null || request.email().isBlank() || request.password() == null) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        loginRateLimiter.checkNotLocked(request.email());

        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> {
                    loginRateLimiter.recordFailedAttempt(request.email());
                    return new InvalidCredentialsException("Invalid email or password");
                });

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            loginRateLimiter.recordFailedAttempt(request.email());
            throw new InvalidCredentialsException("Invalid email or password");
        }

        loginRateLimiter.recordSuccessfulLogin(request.email());

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        return new LoginResponse(token, user.getId(), user.getEmail(), user.getRole());
    }
}
