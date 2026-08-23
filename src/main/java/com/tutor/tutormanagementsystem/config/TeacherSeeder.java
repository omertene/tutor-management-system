package com.tutor.tutormanagementsystem.config;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// creates the one teacher account on startup, but only if no teacher account
// exists yet at all. deliberately checks by role rather than by the fixed seed
// email - if the teacher later changes their own login email (see /teacher/me
// endpoints in TeacherController), findByEmail(teacherEmail) would no longer
// match their renamed row, and the old email-based check would have silently
// recreated a second teacher account with the default password on next restart
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
        if (userRepository.existsByRole(Role.TEACHER)) {
            return; // a teacher account already exists, nothing to do
        }

        User teacher = User.builder()
                // normalised the same way StudentService/UserService store emails, so
                // the seeded teacher can log in regardless of how the property is cased
                .email(teacherEmail.trim().toLowerCase())
                .password(passwordEncoder.encode(teacherPassword))
                .role(Role.TEACHER)
                .firstName("Teacher")
                .lastName("Account")
                .build();

        userRepository.save(teacher);
    }
}
