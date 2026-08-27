package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.MaterialType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/* A study material item as returned to the client - file/link/note details plus the lesson it's linked to, if any */
public record MaterialResponse(
        Long id,
        Long studentId,
        String studentFirstName,
        String studentLastName,
        Long lessonId,
        // null when the material isn't tied to a lesson - lets the frontend show
        // "which lesson this came from" without a second fetch to resolve the id
        LocalDate lessonDate,
        LocalTime lessonStartTime,
        String lessonSubject,
        String title,
        String description,
        MaterialType type,
        String url,
        String fileName,
        LocalDateTime uploadedAt
) {
}
