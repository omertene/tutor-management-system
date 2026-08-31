package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* the requested time clashes with an existing rule/override/lesson */
public class ScheduleConflictException extends ApiException {

    /* just forwards the message and status */
    public ScheduleConflictException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
