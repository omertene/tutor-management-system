package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* no user with this id */
public class UserNotFoundException extends ApiException {

    /* just forwards the message and status */
    public UserNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
