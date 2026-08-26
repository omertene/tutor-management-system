package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// handles DB access for the User table (login/identity info)
public interface UserRepository extends JpaRepository<User, Long> {

    /* finds a user by email, case-insensitive since emails are stored lowercased */
    Optional<User> findByEmailIgnoreCase(String email);

    /* used by TeacherSeeder to check if a teacher account already exists -
       checked by role rather than by the fixed address, so renaming the
       teacher's email doesn't make a new teacher account get created */
    boolean existsByRole(Role role);
}
