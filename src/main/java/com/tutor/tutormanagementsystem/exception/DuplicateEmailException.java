package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the email is already registered to another account */
public class DuplicateEmailException extends ApiException {

    /* carries the message straight through - maps to 409 so the client can show it as a conflict */
    public DuplicateEmailException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
