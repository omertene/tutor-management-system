package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.dto.LessonResponse;
import com.tutor.tutormanagementsystem.dto.StudentLessonRequest;
import com.tutor.tutormanagementsystem.security.AuthenticatedUser;
import com.tutor.tutormanagementsystem.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;

    // teacher books a lesson on behalf of a given student
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/teacher/lessons")
    public ResponseEntity<LessonResponse> createLessonForStudent(@RequestBody LessonRequest request) {
        return ResponseEntity.ok(lessonService.createLessonForStudent(request));
    }

    // student books a lesson for themselves
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/student/lessons")
    public ResponseEntity<LessonResponse> createLessonAsStudent(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestBody StudentLessonRequest request) {
        return ResponseEntity.ok(lessonService.createLessonAsStudent(caller.id(), request));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/lessons")
    public ResponseEntity<List<LessonResponse>> getAllLessonsForTeacher() {
        return ResponseEntity.ok(lessonService.getAllLessonsForTeacher());
    }

    // a student only ever sees their own lessons, so no id is taken from the URL/body
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsForStudent(@AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(lessonService.getLessonsForStudent(caller.id()));
    }

    // teacher views a given student's lessons
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/students/{studentId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsForStudentAsTeacher(@PathVariable Long studentId) {
        return ResponseEntity.ok(lessonService.getLessonsForStudent(studentId));
    }

    // both roles can cancel: LessonService enforces that a student may only cancel their own lesson
    @PreAuthorize("hasAnyRole('TEACHER', 'STUDENT')")
    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> cancelLesson(
            @PathVariable("id") Long lessonId,
            @AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(lessonService.cancelLesson(lessonId, caller.id(), caller.role()));
    }

    // teacher marks a lesson as completed, so it counts toward the student's debt
    @PreAuthorize("hasRole('TEACHER')")
    @PatchMapping("/teacher/lessons/{id}/complete")
    public ResponseEntity<LessonResponse> completeLesson(@PathVariable("id") Long lessonId) {
        return ResponseEntity.ok(lessonService.completeLesson(lessonId));
    }
}
