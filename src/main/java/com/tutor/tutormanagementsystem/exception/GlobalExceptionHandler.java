package com.tutor.tutormanagementsystem.exception;

import com.tutor.tutormanagementsystem.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

// catches specific exceptions thrown anywhere in the app and turns them into
// a clean JSON response instead of Spring's default error page/stack trace
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(DuplicateSubjectException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateSubject (DuplicateSubjectException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(ScheduleConflictException.class)
    public ResponseEntity<ErrorResponse> handleScheduleConflict(ScheduleConflictException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(InvalidTimeRangeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidTimeRange(InvalidTimeRangeException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(PastDateException.class)
    public ResponseEntity<ErrorResponse> handlePastDate(PastDateException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(StudentNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleStudentNotFound(StudentNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(SubjectNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSubjectNotFound(SubjectNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(SlotNotAvailableException.class)
    public ResponseEntity<ErrorResponse> handleSlotNotAvailable(SlotNotAvailableException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(LessonNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleLessonNotFound(LessonNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(LessonAccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleLessonAccessDenied(LessonAccessDeniedException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(InvalidPaymentAmountException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPaymentAmount(InvalidPaymentAmountException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(PaymentNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePaymentNotFound(PaymentNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(InvalidMaterialException.class)
    public ResponseEntity<ErrorResponse> handleInvalidMaterial(InvalidMaterialException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MaterialNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleMaterialNotFound(MaterialNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(InvalidLessonStateException.class)
    public ResponseEntity<ErrorResponse> handleInvalidLessonState(InvalidLessonStateException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(ScheduleRuleNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleScheduleRuleNotFound(ScheduleRuleNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(ScheduleOverrideNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleScheduleOverrideNotFound(ScheduleOverrideNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(InvalidStudentDataException.class)
    public ResponseEntity<ErrorResponse> handleInvalidStudentData(InvalidStudentDataException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(InvalidRequestDataException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRequestData(InvalidRequestDataException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(SubjectInUseException.class)
    public ResponseEntity<ErrorResponse> handleSubjectInUse(SubjectInUseException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(TooManyAttemptsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyAttempts(TooManyAttemptsException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse body = new ErrorResponse(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    // malformed JSON body, or a value that doesn't match the target type
    // (e.g. an empty string where a LocalDate/LocalTime/number was expected)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedRequestBody(HttpMessageNotReadableException ex) {
        ErrorResponse body = new ErrorResponse("The request body is missing or not valid JSON");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    // a required @RequestParam was left out of the request entirely
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingRequestParameter(MissingServletRequestParameterException ex) {
        ErrorResponse body = new ErrorResponse("Missing required parameter: " + ex.getParameterName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    // uploaded file (or whole multipart request) is larger than the configured limit
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        ErrorResponse body = new ErrorResponse("The uploaded file is too large");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
    }

    // a @PreAuthorize check failed (wrong role for this endpoint) - without this handler,
    // adding the Exception.class fallback below would have caught this too and wrongly
    // reported it as a 500 instead of a 403
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        ErrorResponse body = new ErrorResponse("You don't have permission to do that");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    // a database constraint was violated in a way no service-level check caught first
    // (e.g. a NOT NULL/unique constraint) - the raw JDBC/Hibernate message is never
    // safe to send to the client, so this always returns a generic message
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        ErrorResponse body = new ErrorResponse("This request conflicts with existing data");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    // final fallback for anything not handled above - without this, an unexpected
    // exception falls through to Spring's default error page, which has no
    // "message" field and breaks every frontend error handler that reads one
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        ErrorResponse body = new ErrorResponse("Something went wrong. Please try again.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
