package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the material's fields are missing or invalid */
public class InvalidMaterialException extends ApiException {

    /* just forwards the message and status */
    public InvalidMaterialException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
