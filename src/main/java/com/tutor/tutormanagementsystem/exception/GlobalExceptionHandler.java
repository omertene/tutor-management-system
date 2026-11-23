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

/* turns exceptions thrown anywhere in the app into a consistent JSON body
   ({"message": "..."}) instead of Spring's default error page. domain failures
   all go through the single ApiException handler below - each exception knows
   its own status, so there's no per-type handler for those. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /* every expected domain failure: the exception knows its own status */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(new ErrorResponse(ex.getMessage()));
    }

    /* malformed JSON body, or a value that doesn't match the target type */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedRequestBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("גוף הבקשה חסר או שאינו JSON תקין"));
    }

    /* a required @RequestParam was left out of the request entirely */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingRequestParameter(MissingServletRequestParameterException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("חסר פרמטר חובה: " + ex.getParameterName()));
    }

    /* uploaded file (or whole multipart request) is larger than the configured limit */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResponse("הקובץ שהועלה גדול מדי"));
    }

    /* a @PreAuthorize check failed (wrong role for this endpoint) - without this
       handler, the Exception.class fallback below would wrongly report a 500 */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("אין לך הרשאה לבצע פעולה זו"));
    }

    /* someone else changed this row between our read and our write (@Version on
       Lesson/Payment) - a 409 the user can act on by retrying, not a 500 */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLockFailure(ObjectOptimisticLockingFailureException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("מישהו אחר שינה את זה בזמן העריכה. יש לרענן ולנסות שוב."));
    }

    /* a database constraint was violated in a way no service-level check caught -
       the raw JDBC/Hibernate message is never safe to send to the client */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("הבקשה מתנגשת עם נתונים קיימים"));
    }

    /* final fallback for anything not handled above, so it never falls through
       to Spring's default error page (which has no "message" field) */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("משהו השתבש. נסו שוב."));
    }
}
