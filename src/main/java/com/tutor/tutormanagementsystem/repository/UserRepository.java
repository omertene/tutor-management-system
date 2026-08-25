package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // case-insensitive on purpose. emails are stored lowercased
    Optional<User> findByEmailIgnoreCase(String email);

    // used by TeacherSeeder to decide whether a teacher account already exists -
    // checked by role rather than by the fixed address, so renaming the
    // teacher's email doesn't make a new teacher account
    boolean existsByRole(Role role);
}
