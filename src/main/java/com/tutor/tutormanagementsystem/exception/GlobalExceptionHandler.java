package com.tutor.tutormanagementsystem.exception;

import com.tutor.tutormanagementsystem.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

// turns exceptions thrown anywhere in the app into a consistent JSON body
// ({"message": "..."}) instead of Spring's default error page, which has no
// message field and breaks every frontend error path that reads one.
//
// domain failures are all handled by the single ApiException handler below - each
// exception carries its own status, so there's no per-type handler here. the rest
// are framework-level exceptions the app doesn't throw itself.
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // every expected domain failure: the exception knows its own status
    // (see ApiException and its subclasses)
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new ErrorResponse(ex.getMessage()));
    }

    // malformed JSON body, or a value that doesn't match the target type
    // (e.g. an empty string where a LocalDate/LocalTime/number was expected)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedRequestBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("The request body is missing or not valid JSON"));
    }

    // a required @RequestParam was left out of the request entirely
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingRequestParameter(MissingServletRequestParameterException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("Missing required parameter: " + ex.getParameterName()));
    }

    // uploaded file (or whole multipart request) is larger than the configured limit
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResponse("The uploaded file is too large"));
    }

    // a @PreAuthorize check failed (wrong role for this endpoint) - without this handler,
    // the Exception.class fallback below would catch it and wrongly report a 500
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("You don't have permission to do that"));
    }

    // someone else changed this row between our read and our write (@Version on Lesson
    // and Payment). retrying against fresh data is the fix, so this is a 409 the user
    // can act on, not a 500
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLockFailure(ObjectOptimisticLockingFailureException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("Someone else changed this while you were editing it. Reload and try again."));
    }

    // a database constraint was violated in a way no service-level check caught first
    // (e.g. a NOT NULL/unique constraint) - the raw JDBC/Hibernate message is never
    // safe to send to the client, so this always returns a generic message
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("This request conflicts with existing data"));
    }

    // final fallback for anything not handled above - without this, an unexpected
    // exception falls through to Spring's default error page, which has no
    // "message" field and breaks every frontend error handler that reads one
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Something went wrong. Please try again."));
    }
}
