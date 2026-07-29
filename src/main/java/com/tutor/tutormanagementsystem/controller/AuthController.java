package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.dto.LoginResponse;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import com.tutor.tutormanagementsystem.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;


    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        // TODO: handle errors properly later
        User user = userRepository.findByEmail(request.email()).orElseThrow();

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new RuntimeException("invalid credentials");
        }

        // generate the token for this user
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        LoginResponse response = new LoginResponse(token, user.getId(), user.getEmail(), user.getRole());
        return ResponseEntity.ok(response);
    }
}
