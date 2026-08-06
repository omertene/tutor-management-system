package com.tutor.tutormanagementsystem.dto;

public record AddNoteRequest(Long studentId, Long lessonId, String title, String description) {
}
