package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.DebtResponse;
import com.tutor.tutormanagementsystem.dto.MonthlyAmount;
import com.tutor.tutormanagementsystem.dto.PaymentRequest;
import com.tutor.tutormanagementsystem.dto.PaymentResponse;
import com.tutor.tutormanagementsystem.exception.InvalidPaymentAmountException;
import com.tutor.tutormanagementsystem.exception.PaymentNotFoundException;
import com.tutor.tutormanagementsystem.model.Payment;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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

        Student student = studentService.getStudentEntity(request.studentId());

        Payment payment = Payment.builder()
                .student(student)
                .amount(request.amount())
                .method(request.method())
                .notes(request.notes())
                .build();

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

    public DebtResponse getDebtForStudent(Long studentId) {
        Student student = studentService.getStudentEntity(studentId);
        return toDebtResponse(student);
    }
    
    public List<DebtResponse> getAllDebts() {
        return studentService.getAllStudentEntities().stream()
                .map(this::toDebtResponse)
                .toList();
    }

    // used by StatisticsService for the "income per month" table. keeps
    // StatisticsService from injecting PaymentRepository directly.
    // row[0]/row[1] (YEAR/MONTH) come back as Integer or Long depending on the DB/
    // Hibernate version - Number.intValue() handles either without guessing which
    public List<MonthlyAmount> getIncomeByMonth() {
        return paymentRepository.sumPaymentsGroupedByMonth().stream()
                .map(row -> new MonthlyAmount(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).intValue(),
                        (BigDecimal) row[2]))
                .toList();
    }

    // all-time total income, across every payment ever recorded
    public BigDecimal getTotalIncome() {
        return paymentRepository.sumAllPayments();
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
                payment.getAmount(),
                payment.getMethod(),
                payment.getNotes(),
                payment.getCreatedAt()
        );
    }

}
