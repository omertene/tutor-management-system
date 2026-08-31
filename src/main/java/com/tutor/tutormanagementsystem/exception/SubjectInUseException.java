package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the subject still has lessons referencing it */
public class SubjectInUseException extends ApiException {

    /* blocks deleting a subject that's still referenced - just forwards message and status */
    public SubjectInUseException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
