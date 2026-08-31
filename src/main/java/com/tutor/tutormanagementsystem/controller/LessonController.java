package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.BusySlotResponse;
import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.dto.LessonResponse;
import com.tutor.tutormanagementsystem.dto.StudentLessonRequest;
import com.tutor.tutormanagementsystem.dto.UpdateLessonNotesRequest;
import com.tutor.tutormanagementsystem.security.AuthenticatedUser;
import com.tutor.tutormanagementsystem.service.LessonBookingService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/* booking, viewing, editing, canceling and completing lessons. */
@RestController
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;
    private final LessonBookingService lessonBookingService;

    /* teacher books a lesson on behalf of a given student */
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/teacher/lessons")
    public ResponseEntity<LessonResponse> createLessonForStudent(@RequestBody LessonRequest request) {
        return ResponseEntity.ok(lessonService.createLessonForStudent(request));
    }

    /* same as above but outside the teacher's normal hours - routed to LessonBookingService
       since it skips the regular schedule-rule availability check */
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/teacher/lessons/book-outside-hours")
    public ResponseEntity<LessonResponse> createLessonOutsideHours(@RequestBody LessonRequest request) {
        return ResponseEntity.ok(lessonBookingService.createLessonOutsideHours(request));
    }

    /* student books a lesson for themselves */
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/student/lessons")
    public ResponseEntity<LessonResponse> createLessonAsStudent(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestBody StudentLessonRequest request) {
        return ResponseEntity.ok(lessonService.createLessonAsStudent(caller.id(), request));
    }

    /* teacher views every lesson across every student */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/lessons")
    public ResponseEntity<List<LessonResponse>> getAllLessonsForTeacher() {
        return ResponseEntity.ok(lessonService.getAllLessonsForTeacher());
    }

    /* a student only ever sees their own lessons, so no id is taken from the URL/body */
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsForStudent(@AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(lessonService.getLessonsForStudent(caller.id()));
    }

    /* every booked slot in the date range, with no student-identifying info - lets
       a student's schedule view gray out times already taken by someone else */
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student/busy-slots")
    public ResponseEntity<List<BusySlotResponse>> getBusySlots(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return ResponseEntity.ok(lessonService.getBusySlots(startDate, endDate));
    }

    /* teacher views a given student's lessons */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/students/{studentId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsForStudentAsTeacher(@PathVariable Long studentId) {
        return ResponseEntity.ok(lessonService.getLessonsForStudent(studentId));
    }

    /* teacher edits an existing scheduled lesson's student/subject/date/time */
    @PreAuthorize("hasRole('TEACHER')")
    @PutMapping("/teacher/lessons/{id}")
    public ResponseEntity<LessonResponse> updateLesson(
            @PathVariable("id") Long lessonId,
            @RequestBody LessonRequest request) {
        return ResponseEntity.ok(lessonService.updateLesson(lessonId, request));
    }

    /* both roles can cancel: LessonService enforces that a student may only cancel their own lesson */
    @PreAuthorize("hasAnyRole('TEACHER', 'STUDENT')")
    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> cancelLesson(
            @PathVariable("id") Long lessonId,
            @AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(lessonService.cancelLesson(lessonId, caller.id(), caller.role()));
    }

    /* teacher marks a lesson as completed, so it counts toward the student's debt */
    @PreAuthorize("hasRole('TEACHER')")
    @PatchMapping("/teacher/lessons/{id}/complete")
    public ResponseEntity<LessonResponse> completeLesson(@PathVariable("id") Long lessonId) {
        return ResponseEntity.ok(lessonService.completeLesson(lessonId));
    }

    /* teacher-only notes about a lesson - never exposed to the student (see
       LessonService.toResponse's includeNotes flag) */
    @PreAuthorize("hasRole('TEACHER')")
    @PatchMapping("/teacher/lessons/{id}/notes")
    public ResponseEntity<LessonResponse> updateLessonNotes(
            @PathVariable("id") Long lessonId,
            @RequestBody UpdateLessonNotesRequest request) {
        return ResponseEntity.ok(lessonService.updateLessonNotes(lessonId, request.notes()));
    }

    /* total price of lessons completed so far this calendar month - "revenue this month"
       means work actually done this month, not payments received this month */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/revenue/current-month")
    public ResponseEntity<BigDecimal> getCurrentMonthRevenue() {
        return ResponseEntity.ok(lessonService.getCompletedLessonRevenueForCurrentMonth());
    }
}
