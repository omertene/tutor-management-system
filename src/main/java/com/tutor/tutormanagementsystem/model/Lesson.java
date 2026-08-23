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
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

// an actual lesson booked by a student, on a specific date and time range

@Entity
@Table(name = "lessons")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(updatable = false, nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @ManyToOne
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LessonStatus status;

    // snapshot of the student's hourly rate at the moment of booking,
    // so a later rate change doesn't change the price of past lessons
    @Column(nullable = false)
    private BigDecimal priceAtBooking;

    // optional notes about the lesson, e.g. what was covered
    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // optimistic locking. two teacher tabs (or a teacher and a student) editing the
    // same row at once used to silently overwrite each other - last write won and the
    // earlier change vanished with no error. Hibernate now checks this column on every
    // update and throws if the row changed since it was read, which
    // GlobalExceptionHandler turns into a 409 the UI can show.
    // columnDefinition carries the DEFAULT 0 so ddl-auto=update backfills existing
    // rows instead of leaving them NULL (a NULL version breaks the next update)
    @Version
    @Column(nullable = false, columnDefinition = "bigint default 0")
    private Long version;


    // true once the "your lesson is coming up" reminder email has been sent for this
    // lesson - prevents the scheduled reminder job from emailing the same lesson twice.
    // defaults to false for every new lesson booked from now on
    @Column(nullable = false)
    @Builder.Default
    private boolean reminderSent = false;
}
