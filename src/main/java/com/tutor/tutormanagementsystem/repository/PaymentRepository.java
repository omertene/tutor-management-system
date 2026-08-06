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


}