package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* no material with this id */
public class MaterialNotFoundException extends ApiException {

    /* just forwards the message and status - nothing else to look up here */
    public MaterialNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
