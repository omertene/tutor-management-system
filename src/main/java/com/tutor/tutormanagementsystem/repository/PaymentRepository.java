package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // cancelled payments are soft-deleted - every normal read excludes them
    List<Payment> findAllByStudentIdAndCancelledFalse(Long studentId);

    List<Payment> findAllByCancelledFalse();

    // total amount this student has paid so far - the "paid" side of their balance.
    @Query("SELECT COALESCE(sum(p.amount), 0) FROM Payment p WHERE p.student.id = :studentId AND p.cancelled = false")
    BigDecimal sumPaymentsForStudent(@Param("studentId") Long studentId);

    // all-time total across every payment ever recorded
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.cancelled = false")
    BigDecimal sumAllPayments();

    // total amount actually received within a date range
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.paymentDate BETWEEN :startDate AND :endDate AND p.cancelled = false")
    BigDecimal sumPaymentsByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // income received grouped by calendar month
    @Query("SELECT YEAR(p.paymentDate), MONTH(p.paymentDate), COALESCE(SUM(p.amount), 0) FROM Payment p " +
            "WHERE p.paymentDate BETWEEN :startDate AND :endDate AND p.cancelled = false " +
            "GROUP BY YEAR(p.paymentDate), MONTH(p.paymentDate) ORDER BY YEAR(p.paymentDate), MONTH(p.paymentDate)")
    List<Object[]> sumPaymentsByPaymentDateGroupedByMonth(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}