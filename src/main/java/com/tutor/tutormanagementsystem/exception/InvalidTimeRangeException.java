package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* start/end times are out of order or off the 15-minute grid */
public class InvalidTimeRangeException extends ApiException {

    /* just forwards the message and status - no extra state to track */
    public InvalidTimeRangeException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
