package com.tutor.tutormanagementsystem.config;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// creates the one teacher account on startup, but only if it doesn't already exist.
@Component
@RequiredArgsConstructor
public class TeacherSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${teacher.seed.email}")
    private String teacherEmail;

    @Value("${teacher.seed.password}")
    private String teacherPassword;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(teacherEmail).isPresent()) {
            return; // already seeded, nothing to do
        }

        User teacher = User.builder()
                .email(teacherEmail)
                .password(passwordEncoder.encode(teacherPassword))
                .role(Role.TEACHER)
                .firstName("Teacher")
                .lastName("Account")
                .build();

        userRepository.save(teacher);
    }
}
