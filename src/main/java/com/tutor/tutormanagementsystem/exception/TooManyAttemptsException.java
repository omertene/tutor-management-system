package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the login rate limiter has locked this email out */
public class TooManyAttemptsException extends ApiException {

    /* just forwards the message and status - the rate limiter decides when to throw this */
    public TooManyAttemptsException(String message) {
        super(message, HttpStatus.TOO_MANY_REQUESTS);
    }
}
