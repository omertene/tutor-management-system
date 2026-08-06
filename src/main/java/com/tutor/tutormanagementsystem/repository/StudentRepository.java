package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {

    List<Student> findAllByActive(boolean active);
}
