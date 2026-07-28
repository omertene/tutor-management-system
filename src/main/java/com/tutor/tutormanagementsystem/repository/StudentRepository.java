package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<Student, Long> {
}
