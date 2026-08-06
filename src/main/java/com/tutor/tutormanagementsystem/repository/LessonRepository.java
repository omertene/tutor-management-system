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
}
