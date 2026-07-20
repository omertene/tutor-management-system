package com.tutor.tutormanagementsystem.config;

import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail("Elvis@gmail.com").isEmpty()) {
            User teacher = new User();
            teacher.setEmail("Elvis@gmail.com");
            teacher.setFullName("Elvis Levy");
            teacher.setPassword(passwordEncoder.encode("password123"));
            teacher.setRole(Role.TEACHER);

            userRepository.save(teacher);
            System.out.println("✅ Initial teacher account seeded successfully!");
        }
    }
}