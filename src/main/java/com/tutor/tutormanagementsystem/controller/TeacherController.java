package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.CreateStudentRequest;
import com.tutor.tutormanagementsystem.dto.ResetStudentPasswordRequest;
import com.tutor.tutormanagementsystem.dto.SetStudentActiveRequest;
import com.tutor.tutormanagementsystem.dto.StudentResponse;
import com.tutor.tutormanagementsystem.dto.UpdateStudentEmailRequest;
import com.tutor.tutormanagementsystem.dto.UpdateStudentRequest;
import com.tutor.tutormanagementsystem.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    // active students only - feeds booking/payment/material dropdowns
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/students")
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        return ResponseEntity.ok(studentService.getAllStudents());
    }


    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/students/all")
    public ResponseEntity<List<StudentResponse>> getAllStudentsIncludingInactive() {
        return ResponseEntity.ok(studentService.getAllStudentsIncludingInactive());
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PutMapping("/students/{id}")
    public ResponseEntity<StudentResponse> updateStudent(
            @PathVariable("id") Long studentId,
            @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(studentService.updateStudent(studentId, request));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PatchMapping("/students/{id}/email")
    public ResponseEntity<StudentResponse> updateStudentEmail(
            @PathVariable("id") Long studentId,
            @RequestBody UpdateStudentEmailRequest request) {
        return ResponseEntity.ok(studentService.updateStudentEmail(studentId, request.email()));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PatchMapping("/students/{id}/password")
    public ResponseEntity<StudentResponse> resetStudentPassword(
            @PathVariable("id") Long studentId,
            @RequestBody ResetStudentPasswordRequest request) {
        return ResponseEntity.ok(studentService.resetStudentPassword(studentId, request.newPassword()));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PatchMapping("/students/{id}/active")
    public ResponseEntity<StudentResponse> setStudentActive(
            @PathVariable("id") Long studentId,
            @RequestBody SetStudentActiveRequest request) {
        return ResponseEntity.ok(studentService.setStudentActive(studentId, request.active()));
    }
}
