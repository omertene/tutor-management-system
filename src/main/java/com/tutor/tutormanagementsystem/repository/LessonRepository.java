package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    List<Lesson> findAllByStudentId(Long studentId);

    // finds existing lessons on the same date whose time range overlaps the given range,
    // only counting lessons that are still scheduled (a cancelled lesson frees up its slot)
    List<Lesson> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(
            LocalDate date, LocalTime endTime, LocalTime startTime, LessonStatus status);

    // serializes all booking attempts for the same date so the availability-check-then-insert
    // in LessonService can't race: pg_advisory_xact_lock blocks a second transaction trying to
    // lock the same key until the first one commits/rolls back, at which point the lock is
    // released automatically. the key is the date's epoch day - a direct long, no hashing or
    // implicit cast involved. this only works correctly if the calling method is @Transactional -
    // the lock is held for the lifetime of that transaction, not just this one query.
    @Query(value = "SELECT pg_advisory_xact_lock(:key)", nativeQuery = true)
    void acquireDateLock(@Param("key") long key);
}
