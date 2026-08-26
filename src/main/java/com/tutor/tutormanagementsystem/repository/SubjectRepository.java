package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// handles DB access for the Subject table
public interface SubjectRepository extends JpaRepository<Subject, Long> {

    /* finds a subject by name, case-insensitive so "Math" and "math" can't both
       be created as separate subjects, which would split every statistic that
       groups by subject name */
    Optional<Subject> findByNameIgnoreCase(String name);
}
