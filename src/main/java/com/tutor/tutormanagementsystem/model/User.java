package com.tutor.tutormanagementsystem.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

// base user for both teacher and students - login/identity fields only
// anything student-specific (rate, education level) lives on the Student entity instead
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(updatable = false, nullable = false)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email; // Will also serve as the username for login

    @Column(nullable = false)
    private String password;

    // tells us if this user is the teacher or a student
    @Enumerated(EnumType.STRING) // Saves the enum as text ('TEACHER'/'STUDENT') instead of numbers (0/1)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String phone;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}