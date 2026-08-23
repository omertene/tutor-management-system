package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// the email is already registered to another account
public class DuplicateEmailException extends ApiException {

    public DuplicateEmailException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
