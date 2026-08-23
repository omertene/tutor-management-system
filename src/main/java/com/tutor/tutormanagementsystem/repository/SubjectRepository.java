package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    // case-insensitive so "Math" and "math" can't both be created as separate
    // subjects, which would split every statistic that groups by subject name
    Optional<Subject> findByNameIgnoreCase(String name);
}
