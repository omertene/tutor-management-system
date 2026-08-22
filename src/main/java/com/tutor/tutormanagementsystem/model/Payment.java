package com.tutor.tutormanagementsystem.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;


@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(updatable = false, nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private BigDecimal amount;

    // the date the payment was actually received - separate from createdAt (when the
    // record was entered into the system), since a teacher may log a payment a few
    // days after actually receiving it
    @Column(nullable = false)
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // soft delete - "Cancel" on a payment used to hard-delete the row outright, which
    // is the wrong trade for a financial record (unlike a cancelled lesson, which just
    // frees up a time slot, a cancelled payment is the only trace that money changed
    // hands and later got corrected/reversed). cancelled payments are excluded from
    // every sum/list a normal read goes through, but the row itself survives.
    @Builder.Default
    @Column(nullable = false)
    private boolean cancelled = false;
}
