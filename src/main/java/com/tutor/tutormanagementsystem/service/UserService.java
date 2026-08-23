package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.UserResponse;
import com.tutor.tutormanagementsystem.exception.DuplicateEmailException;
import com.tutor.tutormanagementsystem.exception.InvalidStudentDataException;
import com.tutor.tutormanagementsystem.exception.UserNotFoundException;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

// self-service account changes for the logged-in user (currently only reachable
// by the teacher - students don't manage their own credentials, the teacher
// changes those for them via StudentService). identifies the row to update from
// the JWT's own user id, never a path variable, so a caller can only ever change
// their own email/password
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // same shape as StudentService's validation - kept here too rather than shared,
    // since the two validate different entities (User here vs a student's fields there)
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private void validateEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new InvalidStudentDataException("Please enter a valid email address");
        }
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 4) {
            throw new InvalidStudentDataException("Password must be at least 4 characters");
        }
    }

    @Transactional
    public UserResponse updateOwnEmail(Long userId, String newEmail) {
        String email = normalizeEmail(newEmail);
        validateEmail(email);

        User user = getUserEntity(userId);

        if (!email.equalsIgnoreCase(user.getEmail())
                && userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateEmailException("email already registered");
        }

        user.setEmail(email);
        userRepository.save(user);

        return toResponse(user);
    }

    @Transactional
    public UserResponse resetOwnPassword(Long userId, String newPassword) {
        validatePassword(newPassword);

        User user = getUserEntity(userId);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return toResponse(user);
    }

    private User getUserEntity(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName());
    }
}
