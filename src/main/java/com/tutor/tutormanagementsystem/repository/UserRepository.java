package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    // used by TeacherSeeder to decide whether a teacher account already exists -
    // checked by role rather than by the fixed seed email, so renaming the
    // teacher's own login email doesn't make the seeder think none exists yet
    // and create a second, duplicate default-credentials account on next boot
    boolean existsByRole(Role role);
}
