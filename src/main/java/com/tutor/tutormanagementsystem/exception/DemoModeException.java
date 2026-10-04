package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

/* thrown by the demo-mode features: 404 when demo mode is off (so the demo endpoint
   looks like it doesn't exist), 400 when an action is blocked while demo mode is on.
   deliberately not 401/403 - the frontend treats those as "session over" and logs the user out */
public class DemoModeException extends ApiException {

    public DemoModeException(String message, HttpStatus status) {
        super(message, status);
    }
}
