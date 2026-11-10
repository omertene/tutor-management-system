package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.DebtResponse;
import com.tutor.tutormanagementsystem.dto.PaymentRequest;
import com.tutor.tutormanagementsystem.dto.PaymentResponse;
import com.tutor.tutormanagementsystem.exception.InvalidPaymentAmountException;
import com.tutor.tutormanagementsystem.exception.InvalidRequestDataException;
import com.tutor.tutormanagementsystem.exception.PaymentNotFoundException;
import com.tutor.tutormanagementsystem.model.Payment;
import com.tutor.tutormanagementsystem.model.PaymentMethod;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/* unit test for the money logic - validations when recording a payment, soft-cancelling,
   and the debt calculation. the repository and the other services are Mockito fakes. */

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final Long STUDENT_ID = 1L;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private LessonService lessonService;

    @Mock
    private StudentService studentService;

    @InjectMocks
    private PaymentService service;

    private Student student() {
        User user = User.builder().firstName("Dana").lastName("Levi").build();
        return Student.builder().id(STUDENT_ID).user(user).hourlyRate(new BigDecimal("100")).build();
    }

    private PaymentRequest request(BigDecimal amount, PaymentMethod method, LocalDate date) {
        return new PaymentRequest(STUDENT_ID, amount, method, null, date);
    }

    /* ---------- recording a payment ---------- */

    @Test
    void recordPayment_withZeroAmount_isRejectedAndNothingIsSaved() {
        PaymentRequest bad = request(BigDecimal.ZERO, PaymentMethod.CASH, null);

        assertThatThrownBy(() -> service.recordPayment(bad))
                .isInstanceOf(InvalidPaymentAmountException.class);
        verify(paymentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void recordPayment_withNegativeAmount_isRejected() {
        PaymentRequest bad = request(new BigDecimal("-50"), PaymentMethod.CASH, null);

        assertThatThrownBy(() -> service.recordPayment(bad))
                .isInstanceOf(InvalidPaymentAmountException.class);
    }

    @Test
    void recordPayment_withoutAmount_isRejected() {
        PaymentRequest bad = request(null, PaymentMethod.CASH, null);

        assertThatThrownBy(() -> service.recordPayment(bad))
                .isInstanceOf(InvalidPaymentAmountException.class);
    }

    @Test
    void recordPayment_withoutMethod_isRejected() {
        PaymentRequest bad = request(new BigDecimal("100"), null, null);

        assertThatThrownBy(() -> service.recordPayment(bad))
                .isInstanceOf(InvalidRequestDataException.class)
                .hasMessageContaining("method");
    }

    @Test
    void recordPayment_datedInTheFuture_isRejected() {
        PaymentRequest bad = request(new BigDecimal("100"), PaymentMethod.BIT, LocalDate.now().plusDays(1));

        assertThatThrownBy(() -> service.recordPayment(bad))
                .isInstanceOf(InvalidRequestDataException.class)
                .hasMessageContaining("future");
    }

    @Test
    void recordPayment_valid_savesWithTheGivenDetails() {
        LocalDate date = LocalDate.now().minusDays(3);
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student());

        PaymentResponse response = service.recordPayment(
                request(new BigDecimal("250"), PaymentMethod.BANK_TRANSFER, date));

        ArgumentCaptor<Payment> saved = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(saved.capture());
        assertThat(saved.getValue().getAmount()).isEqualByComparingTo("250");
        assertThat(saved.getValue().getMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(saved.getValue().getPaymentDate()).isEqualTo(date);
        assertThat(response.studentFirstName()).isEqualTo("Dana");
    }

    @Test
    void recordPayment_withoutDate_defaultsToToday() {
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student());

        service.recordPayment(request(new BigDecimal("100"), PaymentMethod.CASH, null));

        ArgumentCaptor<Payment> saved = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(saved.capture());
        assertThat(saved.getValue().getPaymentDate()).isEqualTo(LocalDate.now());
    }

    /* ---------- cancelling (soft delete) ---------- */

    @Test
    void cancelPayment_marksItCancelledInsteadOfDeleting() {
        Payment payment = Payment.builder().id(7L).student(student()).amount(new BigDecimal("100")).build();
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(payment));

        service.cancelPayment(7L);

        assertThat(payment.isCancelled()).isTrue();
        verify(paymentRepository).save(payment);
        verify(paymentRepository, never()).delete(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void cancelPayment_alreadyCancelled_isRejected() {
        Payment payment = Payment.builder().id(7L).student(student()).cancelled(true).build();
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> service.cancelPayment(7L))
                .isInstanceOf(InvalidRequestDataException.class);
    }

    @Test
    void cancelPayment_unknownId_throwsNotFound() {
        when(paymentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancelPayment(99L))
                .isInstanceOf(PaymentNotFoundException.class);
    }

    @Test
    void updatePayment_ofACancelledPayment_isRejected() {
        Payment payment = Payment.builder().id(7L).student(student()).cancelled(true).build();
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> service.updatePayment(7L,
                request(new BigDecimal("100"), PaymentMethod.CASH, null)))
                .isInstanceOf(InvalidRequestDataException.class)
                .hasMessageContaining("cancelled");
    }

    /* ---------- debt = completed lessons owed - payments made ---------- */

    @Test
    void debt_isOwedMinusPaid() {
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student());
        when(paymentRepository.sumPaymentsForStudent(STUDENT_ID)).thenReturn(new BigDecimal("200"));
        when(lessonService.sumCompletedLessonPricesForStudent(STUDENT_ID)).thenReturn(new BigDecimal("500"));

        DebtResponse debt = service.getDebtForStudent(STUDENT_ID);

        assertThat(debt.totalOwed()).isEqualByComparingTo("500");
        assertThat(debt.totalPaid()).isEqualByComparingTo("200");
        assertThat(debt.debt()).isEqualByComparingTo("300");
    }

    @Test
    void debt_whenFullyPaid_isZero() {
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student());
        when(paymentRepository.sumPaymentsForStudent(STUDENT_ID)).thenReturn(new BigDecimal("400"));
        when(lessonService.sumCompletedLessonPricesForStudent(STUDENT_ID)).thenReturn(new BigDecimal("400"));

        assertThat(service.getDebtForStudent(STUDENT_ID).debt()).isEqualByComparingTo("0");
    }

    /* documents the current behaviour: paying more than owed gives a negative debt (a credit) */
    @Test
    void debt_whenOverpaid_isNegative() {
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student());
        when(paymentRepository.sumPaymentsForStudent(STUDENT_ID)).thenReturn(new BigDecimal("150"));
        when(lessonService.sumCompletedLessonPricesForStudent(STUDENT_ID)).thenReturn(new BigDecimal("100"));

        assertThat(service.getDebtForStudent(STUDENT_ID).debt()).isEqualByComparingTo("-50");
    }
}
