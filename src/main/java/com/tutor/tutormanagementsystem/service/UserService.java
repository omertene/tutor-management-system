package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.BadCredentialsException;
import com.tutor.tutormanagementsystem.exception.EmailAlreadyExistsException;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public User registerUser(User user) {

        if (getUserByEmail(user.getEmail()).isPresent()) {
            throw new EmailAlreadyExistsException("Error: Email already exists");
        }

        String hashedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(hashedPassword);

        return userRepository.save(user);
    }

    public User loginUser(String email, String password) {

        User user = getUserByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Error: Invalid email or password"));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadCredentialsException("Error: Invalid email or password");
        }

        return user;
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }


}
