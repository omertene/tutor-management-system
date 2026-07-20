package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.RegisterRequest;
import com.tutor.tutormanagementsystem.exception.BadCredentialsException;
import com.tutor.tutormanagementsystem.exception.EmailAlreadyExistsException;
import com.tutor.tutormanagementsystem.model.Role;
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

    public User registerUser(RegisterRequest registerRequest) {

        if (getUserByEmail(registerRequest.getEmail()).isPresent()) {
            throw new EmailAlreadyExistsException("Error: Email already exists");
        }

        User user = new User();
        user.setEmail(registerRequest.getEmail());
        user.setFullName(registerRequest.getFullName());

        String hashedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(hashedPassword);

        user.setRole(Role.STUDENT);

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
