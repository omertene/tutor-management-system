package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the date is in the past */
public class PastDateException extends ApiException {

    /* just forwards the message and status */
    public PastDateException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
