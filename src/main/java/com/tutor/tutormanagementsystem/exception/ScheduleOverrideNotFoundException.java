package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// no schedule override with this id
public class ScheduleOverrideNotFoundException extends ApiException {

    public ScheduleOverrideNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
