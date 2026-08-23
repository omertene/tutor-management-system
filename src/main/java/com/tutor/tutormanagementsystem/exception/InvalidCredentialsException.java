package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// login failed - the email doesn't exist or the password is wrong
public class InvalidCredentialsException extends ApiException {

    public InvalidCredentialsException(String message) {
        super(message, HttpStatus.UNAUTHORIZED);
    }
}
