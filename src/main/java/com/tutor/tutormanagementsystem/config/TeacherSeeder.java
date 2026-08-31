package com.tutor.tutormanagementsystem.config;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/* single-teacher app: creates the one teacher account on first boot if none
   exists yet (checked by role, not by the seed email, so a later email change
   by the teacher doesn't cause a second account to get created) */
@Component
@RequiredArgsConstructor
public class TeacherSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${teacher.seed.email}")
    private String teacherEmail;

    @Value("${teacher.seed.password}")
    private String teacherPassword;

    /* Spring Boot calls this once on startup */
    @Override
    public void run(String... args) {
        if (userRepository.existsByRole(Role.TEACHER)) {
            return; /* a teacher account already exists, nothing to do */
        }

        User teacher = User.builder()
                /* normalized, so the seeded teacher can log in regardless of how the property is cased */
                .email(teacherEmail.trim().toLowerCase())
                .password(passwordEncoder.encode(teacherPassword)) /* never store the raw password */
                .role(Role.TEACHER)
                .firstName("Teacher")
                .lastName("Account")
                .build();

        userRepository.save(teacher);
    }
}
