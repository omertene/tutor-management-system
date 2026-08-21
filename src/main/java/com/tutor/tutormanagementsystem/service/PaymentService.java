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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final LessonService lessonService;
    private final StudentService studentService;

    // teacher records a payment received from a student
    public PaymentResponse recordPayment(PaymentRequest request) {

        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentAmountException("Payment amount must be greater than zero");
        }

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

    // teacher corrects an existing payment (amount, method, notes, date, or even
    // which student it belongs to - e.g. it was logged against the wrong student).
    // debt for both the old and new student is derived on read (sumPaymentsForStudent
    // by studentId), so simply re-pointing the payment at a new student is enough -
    // no separate debt total to patch up on either side.
    public PaymentResponse updatePayment(Long paymentId, PaymentRequest request) {

        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentAmountException("Payment amount must be greater than zero");
        }

        if (request.method() == null) {
            throw new InvalidRequestDataException("Payment method is required");
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found"));

        if (request.studentId() != null && !request.studentId().equals(payment.getStudent().getId())) {
            Student newStudent = studentService.getStudentEntity(request.studentId());
            payment.setStudent(newStudent);
        }

        payment.setAmount(request.amount());
        payment.setMethod(request.method());
        payment.setNotes(request.notes());
        payment.setPaymentDate(request.paymentDate() != null ? request.paymentDate() : payment.getPaymentDate());

        paymentRepository.save(payment);

        return toResponse(payment);
    }

    public void cancelPayment(Long paymentId) {

        if (!paymentRepository.existsById(paymentId)) {
            throw new PaymentNotFoundException("Payment not found");
        }

        paymentRepository.deleteById(paymentId);
    }

    public List<PaymentResponse> getPaymentsForStudent(Long studentId) {

        return paymentRepository.findAllByStudentId(studentId).stream()
                .map(payment -> toResponse(payment)).toList();
    }

    // teacher views every payment across every student at once - the default
    // "payment history" view, instead of requiring a student to be picked first
    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public DebtResponse getDebtForStudent(Long studentId) {
        Student student = studentService.getStudentEntity(studentId);
        return toDebtResponse(student);
    }
    
    public List<DebtResponse> getAllDebts() {
        return studentService.getAllStudentEntities().stream()
                .map(this::toDebtResponse)
                .toList();
    }

    // all-time total income, across every payment ever recorded
    public BigDecimal getTotalIncome() {
        return paymentRepository.sumAllPayments();
    }

    // income actually received within an arbitrary range - the "Actual Income
    // Received" KPI on the unified statistics dashboard, whatever range is selected
    public BigDecimal getIncomeReceivedInRange(LocalDate startDate, LocalDate endDate) {
        return paymentRepository.sumPaymentsByDateRange(startDate, endDate);
    }

    // income received per month within a range (the dashboard passes the trailing
    // 12 months) - the "income received" half of the monthly trend chart
    public List<MonthlyAmount> getIncomeByMonthInRange(LocalDate startDate, LocalDate endDate) {
        return paymentRepository.sumPaymentsByPaymentDateGroupedByMonth(startDate, endDate).stream()
                .map(row -> new MonthlyAmount(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).intValue(),
                        (BigDecimal) row[2]))
                .toList();
    }

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
