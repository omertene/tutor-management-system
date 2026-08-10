package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findAllByStudentId(Long studentId);

    // total amount this student has paid so far - the "paid" side of their balance.
    @Query("SELECT COALESCE(sum(p.amount), 0) FROM Payment p where p.student.id = :studentId")
    BigDecimal sumPaymentsForStudent(@Param("studentId") Long studentId);

    // total income grouped by calendar month, across every student - feeds the
    // statistics dashboard's "income per month" table. returns raw Object[] rows of
    // (year, month, total) since JPQL has no built-in "year-month" type to project into;
    // StatisticsService turns each row into a proper MonthlyAmount
    @Query("SELECT YEAR(p.createdAt), MONTH(p.createdAt), COALESCE(SUM(p.amount), 0) " +
            "FROM Payment p GROUP BY YEAR(p.createdAt), MONTH(p.createdAt) " +
            "ORDER BY YEAR(p.createdAt), MONTH(p.createdAt)")
    List<Object[]> sumPaymentsGroupedByMonth();

    // all-time total across every payment ever recorded
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p")
    BigDecimal sumAllPayments();
}