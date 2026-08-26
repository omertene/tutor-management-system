package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

// handles DB access for the ScheduleOverride table (one-off changes to the weekly schedule)
public interface ScheduleOverrideRepository extends JpaRepository<ScheduleOverride, Long> {

    /* same advisory lock LessonRepository.acquireDateLock takes, keyed the same way
       (epoch day). sharing the key on purpose: booking a lesson and blocking/adding
       availability on the same date are check-then-act writes over the same slot, so
       they have to contend for one lock or a BLOCK can be written between a booking's
       availability check and its insert. transaction-scoped, so it releases on commit */
    @Query(value = "SELECT pg_advisory_xact_lock(:key)", nativeQuery = true)
    void acquireDateLock(@Param("key") long key);

    /* all overrides on a given date */
    List<ScheduleOverride> findAllByDate(LocalDate date);

    /* overrides on a date whose time range overlaps the given range */
    List<ScheduleOverride> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(LocalDate date, LocalTime endTime, LocalTime startTime);
}
