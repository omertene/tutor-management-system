package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// no lesson with this id
public class LessonNotFoundException extends ApiException {

    public LessonNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
