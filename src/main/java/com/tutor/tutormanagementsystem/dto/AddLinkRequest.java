package com.tutor.tutormanagementsystem.dto;

public record AddLinkRequest(Long studentId, Long lessonId, String title, String description, String url) {
}
