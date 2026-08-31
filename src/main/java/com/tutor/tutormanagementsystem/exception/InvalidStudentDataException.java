package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* a student field failed validation */
public class InvalidStudentDataException extends ApiException {

    /* just forwards the message and status - no extra state to track */
    public InvalidStudentDataException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
