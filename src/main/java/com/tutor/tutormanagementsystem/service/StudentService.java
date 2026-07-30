package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.CreateStudentRequest;
import com.tutor.tutormanagementsystem.dto.StudentResponse;
import com.tutor.tutormanagementsystem.exception.DuplicateEmailException;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.StudentRepository;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public StudentResponse createStudent(CreateStudentRequest request) {

        // checks user doesn't exist already
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new DuplicateEmailException("email already registered");
        }

        // builds new user with the information received
        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(Role.STUDENT) // forced here, never taken from the request
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phone(request.phone())
                .build();

        // user needs its id generated before Student can borrow it via @MapsId
        userRepository.save(user);

        // adds the student specific fields
        Student student = Student.builder()
                .user(user)
                .hourlyRate(request.hourlyRate())
                .educationLevel(request.educationLevel())
                .build();

        studentRepository.save(student);

        return new StudentResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                student.getHourlyRate(),
                student.getEducationLevel()
        );
    }
}
