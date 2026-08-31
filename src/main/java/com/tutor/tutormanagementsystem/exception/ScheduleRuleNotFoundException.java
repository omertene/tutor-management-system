package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* no schedule rule with this id */
public class ScheduleRuleNotFoundException extends ApiException {

    /* just forwards the message and status */
    public ScheduleRuleNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
