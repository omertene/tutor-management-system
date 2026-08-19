package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findAllByStudentId(Long studentId);

    // total amount this student has paid so far - the "paid" side of their balance.
    @Query("SELECT COALESCE(sum(p.amount), 0) FROM Payment p where p.student.id = :studentId")
    BigDecimal sumPaymentsForStudent(@Param("studentId") Long studentId);

    // all-time total across every payment ever recorded
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p")
    BigDecimal sumAllPayments();

    // total amount actually received within a date range, keyed off paymentDate (the
    // date the teacher says they were paid) rather than createdAt (when the record was
    // entered) - used for the "this month" dashboard card
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.paymentDate BETWEEN :startDate AND :endDate")
    BigDecimal sumPaymentsByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // income received grouped by calendar month, keyed off paymentDate and scoped to
    // a range (the statistics dashboard passes the last 12 months) - the "income
    // received" half of the monthly trend chart
    @Query("SELECT YEAR(p.paymentDate), MONTH(p.paymentDate), COALESCE(SUM(p.amount), 0) FROM Payment p " +
            "WHERE p.paymentDate BETWEEN :startDate AND :endDate " +
            "GROUP BY YEAR(p.paymentDate), MONTH(p.paymentDate) ORDER BY YEAR(p.paymentDate), MONTH(p.paymentDate)")
    List<Object[]> sumPaymentsByPaymentDateGroupedByMonth(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}