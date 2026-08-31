package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* no lesson with this id */
public class LessonNotFoundException extends ApiException {

    /* just forwards the message and status - no extra state to track */
    public LessonNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
