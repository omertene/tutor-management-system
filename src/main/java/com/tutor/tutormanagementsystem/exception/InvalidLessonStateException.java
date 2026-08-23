package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// the lesson's current status doesn't allow this action
public class InvalidLessonStateException extends ApiException {

    public InvalidLessonStateException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
