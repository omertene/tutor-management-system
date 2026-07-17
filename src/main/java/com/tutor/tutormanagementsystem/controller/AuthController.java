package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.model.User;
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

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody User user) {
        User newUser = userService.registerUser(user);
        return ResponseEntity.ok(newUser);
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody LoginRequest loginRequest) {

        User user = userService.loginUser(loginRequest.getEmail(), loginRequest.getPassword());
        return ResponseEntity.ok(user);
    }
}
