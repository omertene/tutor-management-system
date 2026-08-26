package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.ScheduleRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

// handles DB access for the ScheduleRule table (the teacher's recurring weekly availability)
public interface ScheduleRuleRepository extends JpaRepository<ScheduleRule, Long> {

    /* gets all recurring rules set for a given day of the week */
    List<ScheduleRule> findAllByDayOfWeek(DayOfWeek day);

    /* finds existing rules on the same day whose time range overlaps the given range */
    List<ScheduleRule> findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
            DayOfWeek dayOfWeek, LocalTime endTime, LocalTime startTime);
}
