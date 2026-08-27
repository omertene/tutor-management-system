package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.CreateStudentRequest;
import com.tutor.tutormanagementsystem.dto.StudentResponse;
import com.tutor.tutormanagementsystem.dto.UpdateStudentRequest;
import com.tutor.tutormanagementsystem.exception.DuplicateEmailException;
import com.tutor.tutormanagementsystem.exception.StudentNotFoundException;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.StudentRepository;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/* Service for managing student profiles, authentication credentials, and account statuses */

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /* Registers a new student account, creating both the base user identity and student profile */
    @Transactional
    public StudentResponse createStudent(CreateStudentRequest request) {

        /* Standardize email casing and whitespace to enforce strict uniqueness */
        String email = AccountValidation.normalizeEmail(request.email());

        AccountValidation.requireValidEmail(email);
        AccountValidation.requireValidPassword(request.password());
        AccountValidation.requireValidPhone(request.phone());
        AccountValidation.requireValidHourlyRate(request.hourlyRate());

        /* Ensure email is not already taken */
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateEmailException("email already registered");
        }

        /* Build and persist base user entity with encrypted password and enforced STUDENT role */
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.STUDENT) // forced here, never taken from the request
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phone(request.phone())
                .build();

        userRepository.save(user);

        /* Build and persist student profile linked to the newly created user */        Student student = Student.builder()
                .user(user)
                .hourlyRate(request.hourlyRate())
                .educationLevel(request.educationLevel())
                .notes(request.notes())
                .build();

        studentRepository.save(student);

        return toResponse(student);
    }


    /* Updates student profile details and linked base user information */
    @Transactional
    public StudentResponse updateStudent(Long studentId, UpdateStudentRequest request) {

        /* Validate input constraints for updated fields */
        AccountValidation.requireValidPhone(request.phone());
        AccountValidation.requireValidHourlyRate(request.hourlyRate());

        /* Fetch existing student entity and its associated user */
        Student student = getStudentEntity(studentId);
        User user = student.getUser();

        /* Update base user personal information */
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        userRepository.save(user);

        /* Update student-specific fields */
        student.setHourlyRate(request.hourlyRate());
        student.setEducationLevel(request.educationLevel());
        student.setNotes(request.notes());
        studentRepository.save(student);

        return toResponse(student);
    }


    /* Updates the student's email address ensuring uniqueness and proper format */
    @Transactional
    public StudentResponse updateStudentEmail(Long studentId, String newEmail) {
        String email = AccountValidation.normalizeEmail(newEmail);
        AccountValidation.requireValidEmail(email);

        Student student = getStudentEntity(studentId);
        User user = student.getUser();

        if (!email.equalsIgnoreCase(user.getEmail())
                && userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateEmailException("email already registered");
        }

        user.setEmail(email);
        userRepository.save(user);

        return toResponse(student);
    }

    /* Sets a new encrypted password for the student account */
    @Transactional
    public StudentResponse resetStudentPassword(Long studentId, String newPassword) {
        AccountValidation.requireValidPassword(newPassword);

        Student student = getStudentEntity(studentId);
        User user = student.getUser();

        /* Hash new password before persisting */
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return toResponse(student);
    }

    /* Returns all active students currently enrolled */
    public List<StudentResponse> getAllStudents() {
        return studentRepository.findAllByActive(true).stream()
                .map(this::toResponse)
                .toList();
    }

    /* Returns all students including archived or inactive accounts for management views */
    public List<StudentResponse> getAllStudentsIncludingInactive() {
        return studentRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /* Activates or deactivates a student account */
    @Transactional
    public StudentResponse setStudentActive(Long studentId, boolean active) {
        Student student = getStudentEntity(studentId);
        student.setActive(active);
        studentRepository.save(student);

        return toResponse(student);
    }

    /* Fetches raw student entity for internal domain service communication */
    public Student getStudentEntity(Long studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new StudentNotFoundException("Student not found"));
    }

    /* Returns all raw student entities across the system for batch calculations */
    public List<Student> getAllStudentEntities() {
        return studentRepository.findAll();
    }


    /* Maps Student entity and joined User details to an external StudentResponse DTO */
    private StudentResponse toResponse(Student student) {
        User user = student.getUser();
        return new StudentResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                student.getHourlyRate(),
                student.getEducationLevel(),
                student.getNotes(),
                student.isActive()
        );
    }
}
