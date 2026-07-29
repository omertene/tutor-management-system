package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.dto.LoginResponse;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import com.tutor.tutormanagementsystem.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest request) {
        // TODO: handle errors properly later
        User user = userRepository.findByEmail(request.email()).orElseThrow();

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new RuntimeException("invalid credentials");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        return new LoginResponse(token, user.getId(), user.getEmail(), user.getRole());
    }
}
