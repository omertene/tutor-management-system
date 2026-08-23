package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// the slot isn't bookable - unavailable or already taken
public class SlotNotAvailableException extends ApiException {

    public SlotNotAvailableException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
