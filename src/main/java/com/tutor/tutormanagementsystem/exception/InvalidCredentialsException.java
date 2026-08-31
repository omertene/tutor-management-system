package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* login failed - the email doesn't exist or the password is wrong */
public class InvalidCredentialsException extends ApiException {

    /* deliberately vague message (doesn't say which of the two failed) so login responses don't leak which emails are registered */
    public InvalidCredentialsException(String message) {
        super(message, HttpStatus.UNAUTHORIZED);
    }
}
