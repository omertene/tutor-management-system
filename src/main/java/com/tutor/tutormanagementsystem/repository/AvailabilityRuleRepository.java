package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.AvailabilityRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.UUID;

public interface AvailabilityRuleRepository extends JpaRepository<AvailabilityRule, UUID> {
    List<AvailabilityRule> findByDayOfWeek(DayOfWeek dayOfWeek);
}