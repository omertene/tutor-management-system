package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.config.DemoMode;
import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.dto.LoginResponse;
import com.tutor.tutormanagementsystem.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/* the only public, unauthenticated endpoint in the app - everything else requires a
   JWT. just forwards to AuthService, which does the actual password check, rate
   limiting and token creation. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final DemoMode demoMode;

    /* logs a user in with email/password and hands back a JWT + basic user info. */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /* "Try demo" button: signs in as the teacher without a password. 404 unless DEMO_ENABLED=true. */
    @PostMapping("/demo/teacher")
    public ResponseEntity<LoginResponse> demoTeacherLogin() {
        return ResponseEntity.ok(authService.demoTeacherLogin());
    }

    /* lets the login page know whether to show the "Try demo" button */
    @GetMapping("/demo/status")
    public ResponseEntity<java.util.Map<String, Boolean>> demoStatus() {
        return ResponseEntity.ok(java.util.Map.of("enabled", demoMode.isEnabled()));
    }
}
