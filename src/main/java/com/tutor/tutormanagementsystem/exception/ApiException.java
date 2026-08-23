package com.tutor.tutormanagementsystem.exception;

import org.springframework.http.HttpStatus;

// base class for every expected, domain-level failure in this app.
//
// each subclass carries the HTTP status it should map to, instead of that mapping
// living in a separate @ExceptionHandler method per exception type in
// GlobalExceptionHandler. that file previously held ~23 handlers that were
// byte-identical apart from the exception type and the status, and adding a new
// exception meant editing two files and remembering to keep them in sync.
// now GlobalExceptionHandler needs a single handler for this whole hierarchy, and
// a new exception is one small class that declares its own status.
//
// only for failures that are part of normal operation and safe to show the user -
// getMessage() is sent straight back in the response body. anything unexpected
// should stay an ordinary RuntimeException and fall through to the catch-all
// handler, which logs it and returns a generic message instead of leaking internals.
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;

    protected ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
