package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// no material with this id
public class MaterialNotFoundException extends ApiException {

    public MaterialNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
