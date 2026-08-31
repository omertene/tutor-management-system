package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the payment amount isn't a positive number */
public class InvalidPaymentAmountException extends ApiException {

    /* just forwards the message and status */
    public InvalidPaymentAmountException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
