package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/* Spring Data JPA repository for ScheduleOverride entities (one-off schedule exceptions).
   Shares transaction-scoped advisory locks with LessonRepository to synchronize booking and blocking operations. */

public interface ScheduleOverrideRepository extends JpaRepository<ScheduleOverride, Long> {

    /* Acquires a PostgreSQL transaction-scoped advisory lock keyed by epoch day.
       Shared with LessonRepository to serialize booking vs schedule-blocking operations and prevent race conditions. */
    @Query(value = "SELECT pg_advisory_xact_lock(:key)", nativeQuery = true)
    void acquireDateLock(@Param("key") long key);

    /* All overrides on a given date */
    List<ScheduleOverride> findAllByDate(LocalDate date);

    /* Finds overrides on a given date that overlap with the requested time window (StartA < EndB AND EndA > StartB) */
    List<ScheduleOverride> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(LocalDate date, LocalTime endTime, LocalTime startTime);
}
