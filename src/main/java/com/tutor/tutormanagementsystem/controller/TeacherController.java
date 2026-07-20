package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.RegisterRequest;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teacher") // מוגן ב-SecurityConfig רק ל-TEACHER!
@RequiredArgsConstructor
public class TeacherController {

    private final UserService userService;

    @PostMapping("/students")
    public ResponseEntity<User> createStudent(@RequestBody RegisterRequest registerRequest) {
        User newStudent = userService.registerUser(registerRequest);
        return ResponseEntity.ok(newStudent);
    }
}