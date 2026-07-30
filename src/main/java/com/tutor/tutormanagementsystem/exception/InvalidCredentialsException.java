package com.tutor.tutormanagementsystem.exception;

// thrown when login fails because the email doesn't exist or the password is wrong
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
