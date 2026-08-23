package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// a required request field is missing or invalid
public class InvalidRequestDataException extends ApiException {

    public InvalidRequestDataException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
