package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// handles DB access for the Student table
public interface StudentRepository extends JpaRepository<Student, Long> {

    /* gets all students, filtered by active/inactive */
    List<Student> findAllByActive(boolean active);
}
