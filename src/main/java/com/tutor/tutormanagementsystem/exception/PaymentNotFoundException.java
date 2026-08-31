package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* no payment with this id */
public class PaymentNotFoundException extends ApiException {

    /* just forwards the message and status */
    public PaymentNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
