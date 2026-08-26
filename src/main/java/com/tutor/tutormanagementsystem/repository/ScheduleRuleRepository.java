package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.ScheduleRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/* Spring Data JPA repository for recurring weekly availability rules (ScheduleRule).
   Provides lookups by day of week and interval overlap queries to prevent conflicting time slots. */

public interface ScheduleRuleRepository extends JpaRepository<ScheduleRule, Long> {

    /* Gets all recurring rules set for a given day of the week */
    List<ScheduleRule> findAllByDayOfWeek(DayOfWeek day);

    /* Finds existing rules on the same day whose time range overlaps the given range */
    List<ScheduleRule> findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
            DayOfWeek dayOfWeek, LocalTime endTime, LocalTime startTime);
}
