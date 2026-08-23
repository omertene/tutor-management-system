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

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    List<Lesson> findAllByStudentId(Long studentId);

    // total price of every COMPLETED lesson for this student - the "owed" side of their balance
    @Query("SELECT COALESCE(SUM(l.priceAtBooking), 0) FROM Lesson l " +
            "WHERE l.student.id = :studentId AND l.status = :status")
    BigDecimal sumLessonPricesForStudentByStatus(@Param("studentId") Long studentId, @Param("status") LessonStatus status);

    List<Lesson> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(
            LocalDate date, LocalTime endTime, LocalTime startTime, LessonStatus status);

    // for double-booking checks: a slot is taken if ANY non-cancelled lesson overlaps
    // it, not just a SCHEDULED one - a COMPLETED lesson still genuinely happened at
    // that time and must keep blocking new bookings there, same as getBusySlots (the
    // student grid's "is this slot taken" endpoint) already treats it
    List<Lesson> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(
            LocalDate date, LocalTime endTime, LocalTime startTime, LessonStatus statusNot);

    // every non-cancelled lesson whose date falls within the visible week - backs
    // getBusySlots, which used to findAll() the whole lessons table on every load
    List<Lesson> findAllByStatusNotAndDateBetween(LessonStatus statusNot, LocalDate startDate, LocalDate endDate);


    @Query(value = "SELECT pg_advisory_xact_lock(:key)", nativeQuery = true)
    void acquireDateLock(@Param("key") long key);


    // total price of every lesson of the given status whose date falls within the range -
    // used for "revenue this month", counted by when the lesson happened, not when it was paid
    @Query("SELECT COALESCE(SUM(l.priceAtBooking), 0) FROM Lesson l " +
            "WHERE l.status = :status AND l.date BETWEEN :startDate AND :endDate")
    BigDecimal sumLessonPricesByStatusAndDateRange(
            @Param("status") LessonStatus status, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);


    List<Lesson> findAllByStatusAndReminderSentFalse(LessonStatus status);

    long countBySubjectId(Long subjectId);

    // every COMPLETED lesson whose date falls within an arbitrary range, optionally
    // scoped to one subject. fetch-joins student/subject so the statistics dashboard
    // can aggregate revenue, hours, per-subject and per-student totals, and the last-
    // 12-months trend all from one query instead of a dozen narrower ones.
    // subjectId = null means "every subject".
    @Query("SELECT l FROM Lesson l JOIN FETCH l.student JOIN FETCH l.subject " +
            "WHERE l.status = :status AND l.date BETWEEN :startDate AND :endDate " +
            "AND (:subjectId IS NULL OR l.subject.id = :subjectId)")
    List<Lesson> findCompletedInRange(
            @Param("status") LessonStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("subjectId") Long subjectId);

    // every distinct year that has at least one COMPLETED lesson - populates the
    // statistics dashboard's year picker so the teacher can't pick an empty year
    @Query("SELECT DISTINCT YEAR(l.date) FROM Lesson l WHERE l.status = :status ORDER BY YEAR(l.date) DESC")
    List<Integer> findDistinctYearsWithCompletedLessons(@Param("status") LessonStatus status);
}
