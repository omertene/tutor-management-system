package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.AvailabilityRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;


public interface AvailabilityRepository extends JpaRepository<AvailabilityRule, UUID> {

    List<AvailabilityRule> findByDate(LocalDate date);

    boolean existsByDateAndStartTimeLessThanEqualAndEndTimeGreaterThanEqual(
            LocalDate date, LocalTime requestedStart, LocalTime requestedEnd);
}
