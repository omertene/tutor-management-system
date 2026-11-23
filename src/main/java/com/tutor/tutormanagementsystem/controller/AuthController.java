package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.ForgotPasswordRequest;
import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.dto.LoginResponse;
import com.tutor.tutormanagementsystem.dto.MessageResponse;
import com.tutor.tutormanagementsystem.dto.ResetPasswordRequest;
import com.tutor.tutormanagementsystem.service.AuthService;
import com.tutor.tutormanagementsystem.service.PasswordResetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/* the public, unauthenticated endpoints of the app - everything else requires a
   JWT. login goes to AuthService (password check, rate limiting, token creation),
   the "forgot password" flow goes to PasswordResetService. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    /* logs a user in with email/password and hands back a JWT + basic user info. */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /* "forgot password": emails a one-time reset link if the address is registered.
       the answer is always the same, so nobody can use this to find out who has an account. */
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(new MessageResponse(
                "אם האימייל רשום במערכת, נשלח אליו קישור לאיפוס סיסמה"));
    }

    /* sets a new password using the token from the emailed link */
    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(new MessageResponse("הסיסמה עודכנה"));
    }

}
