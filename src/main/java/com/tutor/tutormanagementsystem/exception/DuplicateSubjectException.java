package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* a subject with this name already exists */
public class DuplicateSubjectException extends ApiException {

    /* just forwards the message and status - no extra state to track */
    public DuplicateSubjectException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
