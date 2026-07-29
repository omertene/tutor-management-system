package com.tutor.tutormanagementsystem.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// this holds the extra info that only students need (not the teacher)
// the id and user fields link this back to the User row that has the login info
@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    private Long id;

    // links this Student row to its User row (1-to-1, sharing the same PK)
    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    // student's hourly rate
    @Column(nullable = false)
    private BigDecimal hourlyRate;

    // not always a real grade (could be prep year, university, etc.), so keeping it as free text
    // maybe i'll change to enum later
    private String educationLevel;

    @Column(columnDefinition = "TEXT") // teacher's notes about the student, optional
    private String notes;
}
