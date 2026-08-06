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
                .notes(request.notes())
                .build();

        studentRepository.save(student);

        return toResponse(student);
    }


    @Transactional
    public StudentResponse updateStudent(Long studentId, UpdateStudentRequest request) {
        Student student = getStudentEntity(studentId);
        User user = student.getUser();

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        userRepository.save(user);

        student.setHourlyRate(request.hourlyRate());
        student.setEducationLevel(request.educationLevel());
        student.setNotes(request.notes());
        studentRepository.save(student);

        return toResponse(student);
    }


    public List<StudentResponse> getAllStudents() {
        return studentRepository.findAllByActive(true).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<StudentResponse> getAllStudentsIncludingInactive() {
        return studentRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }


    @Transactional
    public StudentResponse setStudentActive(Long studentId, boolean active) {
        Student student = getStudentEntity(studentId);
        student.setActive(active);
        studentRepository.save(student);

        return toResponse(student);
    }

    // returns the raw entity for other services (e.g. LessonService) that need
    // to work with the Student aggregate directly instead of its DTO projection
    public Student getStudentEntity(Long studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new StudentNotFoundException("Student not found"));
    }

    public List<Student> getAllStudentEntities() {
        return studentRepository.findAll();
    }

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
