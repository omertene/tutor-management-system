package com.tutor.tutormanagementsystem.dto;

/* Request to share a link with a student, optionally tied to a specific lesson */
public record AddLinkRequest(Long studentId, Long lessonId, String title, String description, String url) {
}
