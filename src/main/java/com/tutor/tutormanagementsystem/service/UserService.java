package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.UserResponse;
import com.tutor.tutormanagementsystem.exception.DuplicateEmailException;
import com.tutor.tutormanagementsystem.exception.UserNotFoundException;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


/* Service for managing self-service credential updates for authenticated users */

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /* Updates the email address of the authenticated user after checking format and system uniqueness */
    @Transactional
    public UserResponse updateOwnEmail(Long userId, String newEmail) {

        String email = AccountValidation.normalizeEmail(newEmail);
        AccountValidation.requireValidEmail(email);

        User user = getUserEntity(userId);

        /* Verify email is not already claimed by another account */
        if (!email.equalsIgnoreCase(user.getEmail())
                && userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateEmailException("email already registered");
        }

        user.setEmail(email);
        userRepository.save(user);

        return toResponse(user);
    }

    /* Hashes and updates the authenticated user's account password */
    @Transactional
    public UserResponse resetOwnPassword(Long userId, String newPassword) {
        AccountValidation.requireValidPassword(newPassword);

        User user = getUserEntity(userId);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return toResponse(user);
    }

    /* Retrieves user entity by ID or throws domain not-found exception */
    private User getUserEntity(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    /* Projects User entity into clean UserResponse DTO */
    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName());
    }
}
