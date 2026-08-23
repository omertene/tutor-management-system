package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// the caller may only act on their own lesson/material
public class LessonAccessDeniedException extends ApiException {

    public LessonAccessDeniedException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}
