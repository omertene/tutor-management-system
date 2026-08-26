package com.tutor.tutormanagementsystem.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;

/* the teacher's recurring weekly availability pattern (e.g. every Sunday 08:00-16:00)
   this is only the pattern - actual bookable time for a real date is worked out
   by combining this with any ScheduleOverride rows for that date */

@Entity
@Table(name = "schedule_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(updatable = false, nullable = false)
    private Long id;

    // which day of the week this rule applies to
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DayOfWeek dayOfWeek;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;
}
