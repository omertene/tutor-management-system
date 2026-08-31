package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* base class for every expected, domain-level failure - each subclass carries
   its own HTTP status, so GlobalExceptionHandler needs just one handler for all of them */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;

    /* stores the message (goes to the client as-is) and the HTTP status this
       failure should map to */
    protected ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    /* the HTTP status GlobalExceptionHandler should respond with for this failure */
    public HttpStatus getStatus() {
        return status;
    }
}
