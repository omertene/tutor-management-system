package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.CreateStudentRequest;
import com.tutor.tutormanagementsystem.dto.StudentResponse;
import com.tutor.tutormanagementsystem.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/teacher")
@RequiredArgsConstructor
public class TeacherController {

    private final StudentService studentService;

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/register")
    public ResponseEntity<StudentResponse> register(@RequestBody CreateStudentRequest request) {
        return ResponseEntity.ok(studentService.createStudent(request));
    }
}
