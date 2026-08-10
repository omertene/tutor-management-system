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


    @Query(value = "SELECT pg_advisory_xact_lock(:key)", nativeQuery = true)
    void acquireDateLock(@Param("key") long key);

    // number of COMPLETED lessons grouped by calendar month - feeds the statistics
    // dashboard's "lessons per month" table. only COMPLETED counts, same reasoning as
    // the debt calculation: a SCHEDULED lesson hasn't happened yet, a CANCELLED one
    // never did. rows come back as (year, month, count) - see sumPaymentsGroupedByMonth
    // for why this is Object[] instead of a typed projection
    @Query("SELECT YEAR(l.date), MONTH(l.date), COUNT(l) FROM Lesson l " +
            "WHERE l.status = :status GROUP BY YEAR(l.date), MONTH(l.date) " +
            "ORDER BY YEAR(l.date), MONTH(l.date)")
    List<Object[]> countCompletedLessonsGroupedByMonth(@Param("status") LessonStatus status);

    // COMPLETED lesson count and total revenue per subject - feeds the "breakdown by
    // subject" section. rows come back as (subjectName, count, totalRevenue)
    @Query("SELECT l.subject.name, COUNT(l), COALESCE(SUM(l.priceAtBooking), 0) FROM Lesson l " +
            "WHERE l.status = :status GROUP BY l.subject.name ORDER BY l.subject.name")
    List<Object[]> summarizeCompletedLessonsBySubject(@Param("status") LessonStatus status);

    // total count of COMPLETED lessons, all-time
    long countByStatus(LessonStatus status);
}
