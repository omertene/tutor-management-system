package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.AuthResponse;
import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.service.JwtService;
import com.tutor.tutormanagementsystem.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody User user) {
        User newUser = userService.registerUser(user);

        String token = jwtService.generateToken(newUser);

        AuthResponse response = new AuthResponse(
                newUser.getId(),
                newUser.getEmail(),
                newUser.getFullName(),
                newUser.getRole(),
                token
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest loginRequest) {

        User user = userService.loginUser(loginRequest.getEmail(), loginRequest.getPassword());

        String token = jwtService.generateToken(user);

        AuthResponse response = new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                token
        );
        return ResponseEntity.ok(response);
    }
}
