package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface ScheduleOverrideRepository extends JpaRepository<ScheduleOverride, Long> {

    List<ScheduleOverride> findAllByDate(LocalDate date);
    List<ScheduleOverride> findAllByDateAndStartTimeLessThanAndEndTimeGreaterThan(LocalDate date, LocalTime endTime, LocalTime startTime);
}
