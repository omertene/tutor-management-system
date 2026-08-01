package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.ScheduleRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface ScheduleRuleRepository extends JpaRepository<ScheduleRule, Long> {

    List<ScheduleRule> findAllByDayOfWeek(DayOfWeek day);

    // finds existing rules on the same day whose time range overlaps the given range
    List<ScheduleRule> findAllByDayOfWeekAndStartTimeLessThanAndEndTimeGreaterThan(
            DayOfWeek dayOfWeek, LocalTime endTime, LocalTime startTime);
}
