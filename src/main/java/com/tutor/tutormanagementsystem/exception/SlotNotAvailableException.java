package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the slot isn't bookable - unavailable or already taken */
public class SlotNotAvailableException extends ApiException {

    /* just forwards the message and status - caller says why the slot isn't available */
    public SlotNotAvailableException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
