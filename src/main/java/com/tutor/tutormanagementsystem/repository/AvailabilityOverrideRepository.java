package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.AvailabilityOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AvailabilityOverrideRepository extends JpaRepository<AvailabilityOverride, UUID> {
    List<AvailabilityOverride> findByDate(LocalDate date);
}