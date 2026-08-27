package com.tutor.tutormanagementsystem.dto;

/* Request to add a text note as study material for a student */
public record AddNoteRequest(Long studentId, Long lessonId, String title, String description) {
}
