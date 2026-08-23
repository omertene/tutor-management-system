package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// the payment amount isn't a positive number
public class InvalidPaymentAmountException extends ApiException {

    public InvalidPaymentAmountException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
