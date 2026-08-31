package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* a required request field is missing or invalid */
public class InvalidRequestDataException extends ApiException {

    /* generic 400 for request validation failures that don't have a more specific exception of their own */
    public InvalidRequestDataException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
