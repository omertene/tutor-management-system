package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.DebtResponse;
import com.tutor.tutormanagementsystem.dto.MonthlyAmount;
import com.tutor.tutormanagementsystem.dto.PaymentRequest;
import com.tutor.tutormanagementsystem.dto.PaymentResponse;
import com.tutor.tutormanagementsystem.exception.InvalidPaymentAmountException;
import com.tutor.tutormanagementsystem.exception.InvalidRequestDataException;
import com.tutor.tutormanagementsystem.exception.PaymentNotFoundException;
import com.tutor.tutormanagementsystem.model.Payment;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/* Service for managing student payments, debt calculations, and revenue statistics */

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final LessonService lessonService;
    private final StudentService studentService;


    /* Records a new payment received from a student with input validations */
    @Transactional
    public PaymentResponse recordPayment(PaymentRequest request) {

        /* Payment amount must be strictly positive */
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentAmountException("Payment amount must be greater than zero");
        }

        /* Payment method (cash, bit, bank transfer) is mandatory */
        if (request.method() == null) {
            throw new InvalidRequestDataException("Payment method is required");
        }


        Student student = studentService.getStudentEntity(request.studentId());

        Payment payment = Payment.builder()
                .student(student)
                .amount(request.amount())
                .method(request.method())
                .notes(request.notes())
                .paymentDate(request.paymentDate() != null ? request.paymentDate() : LocalDate.now())
                .build();

        paymentRepository.save(payment);

        return toResponse(payment);
    }

    /* Updates an active payment's details, amount, date, or associated student */
    @Transactional
    public PaymentResponse updatePayment(Long paymentId, PaymentRequest request) {

        /* Ensure updated amount remains positive */
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentAmountException("Payment amount must be greater than zero");
        }

        if (request.method() == null) {
            throw new InvalidRequestDataException("Payment method is required");
        }

        /* Locate target payment */
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found"));

        /* Block editing historically canceled records */
        if (payment.isCancelled()) {
            throw new InvalidRequestDataException("A cancelled payment can't be edited");
        }

        /* Re-assign payment to a different student if teacher logged it against the wrong student */
        if (request.studentId() != null && !request.studentId().equals(payment.getStudent().getId())) {
            Student newStudent = studentService.getStudentEntity(request.studentId());
            payment.setStudent(newStudent);
        }

        /* Update payment fields */
        payment.setAmount(request.amount());
        payment.setMethod(request.method());
        payment.setNotes(request.notes());
        payment.setPaymentDate(request.paymentDate() != null ? request.paymentDate() : payment.getPaymentDate());

        paymentRepository.save(payment);

        return toResponse(payment);
    }

    /* Soft delete - marks payment canceled to maintain financial audit trail */
    @Transactional
    public void cancelPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found"));

        /* Prevent cancelling an already cancelled record */
        if (payment.isCancelled()) {
            throw new InvalidRequestDataException("This payment is already cancelled");
        }

        /* Flag as cancelled instead of deleting the DB row */
        payment.setCancelled(true);
        paymentRepository.save(payment);
    }

    /* Returns all active payments made by a specific student */
    public List<PaymentResponse> getPaymentsForStudent(Long studentId) {

        return paymentRepository.findAllByStudentIdAndCancelledFalse(studentId).stream()
                .map(payment -> toResponse(payment)).toList();
    }

    /* Returns all active payments across all students for main history view */
    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAllByCancelledFalse().stream()
                .map(this::toResponse)
                .toList();
    }


    /* Calculates total debt, paid amount, and owed amount for a specific student */
    @Transactional(readOnly = true)
    public DebtResponse getDebtForStudent(Long studentId) {
        Student student = studentService.getStudentEntity(studentId);
        return toDebtResponse(student);
    }

    /* Calculates and returns debt summaries for all students in the system */
    @Transactional(readOnly = true)
    public List<DebtResponse> getAllDebts() {
        return studentService.getAllStudentEntities().stream()
                .map(this::toDebtResponse)
                .toList();
    }

    /* Returns all-time total income received across all recorded payments */
    public BigDecimal getTotalIncome() {
        return paymentRepository.sumAllPayments();
    }

    /* Calculates total income received within a specific date range */
    public BigDecimal getIncomeReceivedInRange(LocalDate startDate, LocalDate endDate) {
        return paymentRepository.sumPaymentsByDateRange(startDate, endDate);
    }

    /* Returns monthly breakdown of received income for financial dashboard charts */
    public List<MonthlyAmount> getIncomeByMonthInRange(LocalDate startDate, LocalDate endDate) {
        return paymentRepository.sumPaymentsByPaymentDateGroupedByMonth(startDate, endDate).stream()
                .map(row -> new MonthlyAmount(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).intValue(),
                        (BigDecimal) row[2]))
                .toList();
    }

    /* Calculates financial balance for a student by comparing lessons owed vs payments made */
    private DebtResponse toDebtResponse(Student student) {
        BigDecimal paid = paymentRepository.sumPaymentsForStudent(student.getId());
        BigDecimal owed = lessonService.sumCompletedLessonPricesForStudent(student.getId());
        BigDecimal debt = owed.subtract(paid);

        return new DebtResponse(
                student.getId(),
                student.getUser().getFirstName(),
                student.getUser().getLastName(),
                owed,
                paid,
                debt
        );
    }

    /* Maps Payment entity to PaymentResponse DTO */
    private PaymentResponse toResponse(Payment payment) {

        return new PaymentResponse(
                payment.getId(),
                payment.getStudent().getId(),
                payment.getStudent().getUser().getFirstName(),
                payment.getStudent().getUser().getLastName(),
                payment.getAmount(),
                payment.getMethod(),
                payment.getNotes(),
                payment.getPaymentDate(),
                payment.getCreatedAt()
        );
    }

}
