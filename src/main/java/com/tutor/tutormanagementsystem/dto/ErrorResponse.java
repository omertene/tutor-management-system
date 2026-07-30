package com.tutor.tutormanagementsystem.dto;

// the JSON shape sent back to the client whenever a handled error occurs
public record ErrorResponse(String message) {
}
