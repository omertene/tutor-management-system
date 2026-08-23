package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// no subject with this id
public class SubjectNotFoundException extends ApiException {

    public SubjectNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
