package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User registerUser(User user) {

        if (getUserByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Error: Email already exists");
        }
        return userRepository.save(user);
    }

    public User loginUser(String email, String password) {

        User user = getUserByEmail(email).
                orElseThrow(() -> new RuntimeException("Error: Invalid email or password"));
        if (!user.getPassword().equals(password)) {
            throw new RuntimeException("Error: Invalid email or password");
        }

        return user;
    }

}
;