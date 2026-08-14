package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.DebtResponse;
import com.tutor.tutormanagementsystem.dto.PaymentRequest;
import com.tutor.tutormanagementsystem.dto.PaymentResponse;
import com.tutor.tutormanagementsystem.security.AuthenticatedUser;
import com.tutor.tutormanagementsystem.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/teacher/payments")
    public ResponseEntity<PaymentResponse> createPayment(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.recordPayment(request));
    }

    // student views their own payment history
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student/payments")
    public ResponseEntity<List<PaymentResponse>> getOwnPayments(@AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(paymentService.getPaymentsForStudent(caller.id()));
    }

    // teacher views a given student's payment history
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/students/{studentId}/payments")
    public ResponseEntity<List<PaymentResponse>> getPaymentsForStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(paymentService.getPaymentsForStudent(studentId));
    }

    // teacher views every payment across every student - the default payment
    // history view
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/payments")
    public ResponseEntity<List<PaymentResponse>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @PreAuthorize("hasRole('TEACHER')")
    @DeleteMapping("/teacher/payments/{id}")
    public ResponseEntity<Void> cancelPayment(@PathVariable("id") Long paymentId) {
        paymentService.cancelPayment(paymentId);
        return ResponseEntity.noContent().build();
    }

    // teacher views a given student's current balance
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/students/{studentId}/debt")
    public ResponseEntity<DebtResponse> getDebtForStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(paymentService.getDebtForStudent(studentId));
    }

    // teacher views every student's balance at once - feeds the "open debt" dashboard list
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/debts")
    public ResponseEntity<List<DebtResponse>> getAllDebts() {
        return ResponseEntity.ok(paymentService.getAllDebts());
    }

    // student views their own current balance
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student/debt")
    public ResponseEntity<DebtResponse> getOwnDebt(@AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(paymentService.getDebtForStudent(caller.id()));
    }
}
