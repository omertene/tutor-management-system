package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


/* Spring Data JPA repository for Student entities.
   Provides filtered queries supporting soft-deletion status (active vs inactive students). */

public interface StudentRepository extends JpaRepository<Student, Long> {

    /* Gets all students, filtered by active/inactive */
    List<Student> findAllByActive(boolean active);
}
