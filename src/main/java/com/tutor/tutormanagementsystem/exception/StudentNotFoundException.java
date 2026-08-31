package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* no student with this id */
public class StudentNotFoundException extends ApiException {

    /* just forwards the message and status - nothing else to look up here */
    public StudentNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
