package com.tutor.tutormanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ErrorResponse {
    private final LocalDateTime timestamp;
    private final int status;
    private final String error;
    private final String message;
}