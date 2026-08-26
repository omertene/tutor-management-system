package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/* Spring Data JPA repository for Lesson entities.
   Handles schedule queries, overlap validation, financial aggregations, and DB-level concurrency locks. */

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    /* finds all lessons booked by one student */
    List<Lesson> findAllByStudentId(Long studentId);

    /* total price of every COMPLETED lesson for this student - the "owed" side of their balance */
    @Query("SELECT COALESCE(SUM(l.priceAtBooking), 0) FROM Lesson l " +
            "WHERE l.student.id = :studentId AND l.status = :status")
    BigDecimal sumLessonPricesForStudentByStatus(@Param("studentId") Long studentId, @Param("status") LessonStatus status);

    /* finds all lessons on a given date/time range with a specific status - used for overlap checks */
    List<Lesson> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(
            LocalDate date, LocalTime endTime, LocalTime startTime, LessonStatus status);

    /* for double-booking checks: a slot is taken if any non-canceled lesson overlaps it */
    List<Lesson> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(
            LocalDate date, LocalTime endTime, LocalTime startTime, LessonStatus statusNot);

    /* finds every non-canceled lesson whose date falls within the visible week */
    List<Lesson> findAllByStatusNotAndDateBetween(LessonStatus statusNot, LocalDate startDate, LocalDate endDate);

    /* postgres advisory lock, keyed by date (epoch day), so two bookings on the same date can't race each other
       pessimistic lock doesn't work because no row exists at first */
    @Query(value = "SELECT pg_advisory_xact_lock(:key)", nativeQuery = true)
    void acquireDateLock(@Param("key") long key);

    /* total price of every lesson of the given status whose date falls within the range - used for "revenue this month" */
    @Query("SELECT COALESCE(SUM(l.priceAtBooking), 0) FROM Lesson l " +
            "WHERE l.status = :status AND l.date BETWEEN :startDate AND :endDate")
    BigDecimal sumLessonPricesByStatusAndDateRange(
            @Param("status") LessonStatus status, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /* lessons that still need their "coming up" reminder email sent */
    List<Lesson> findAllByStatusAndReminderSentFalse(LessonStatus status);

    /* how many lessons use this subject - used to block deleting a subject still in use */
    long countBySubjectId(Long subjectId);

    /* every COMPLETED lesson whose date falls within an given range, optionally
       scoped to one subject. fetch-joins student/subject so the statistics dashboard
       can aggregate revenue, hours, per-subject and per-student totals, and the last-
       12-months trend all from one query */
    @Query("SELECT l FROM Lesson l JOIN FETCH l.student JOIN FETCH l.subject " +
            "WHERE l.status = :status AND l.date BETWEEN :startDate AND :endDate " +
            "AND (:subjectId IS NULL OR l.subject.id = :subjectId)")
    List<Lesson> findCompletedInRange(
            @Param("status") LessonStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("subjectId") Long subjectId);

    /* every distinct year that has at least one COMPLETED lesson - populates the
       statistics dashboard's year picker so the teacher can't pick an empty year */
    @Query("SELECT DISTINCT YEAR(l.date) FROM Lesson l WHERE l.status = :status ORDER BY YEAR(l.date) DESC")
    List<Integer> findDistinctYearsWithCompletedLessons(@Param("status") LessonStatus status);
}
