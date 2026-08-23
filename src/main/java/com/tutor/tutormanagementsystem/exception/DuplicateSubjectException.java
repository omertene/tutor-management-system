package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// a subject with this name already exists
public class DuplicateSubjectException extends ApiException {

    public DuplicateSubjectException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
