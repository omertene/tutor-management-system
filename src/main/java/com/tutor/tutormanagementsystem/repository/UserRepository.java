package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/* Spring Data JPA repository for User authentication and identity entities.
   Provides case-insensitive credential lookup and role-based existence checks. */

public interface UserRepository extends JpaRepository<User, Long> {

    /* finds a user by email, case-insensitive since emails are stored lowercased */
    Optional<User> findByEmailIgnoreCase(String email);

    /* Checks if an account with a specific role exists.
       Used by seeders to prevent duplicate admin/teacher creation */
    boolean existsByRole(Role role);
}
