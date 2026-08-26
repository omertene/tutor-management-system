package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/* Spring Data JPA repository for Subject entities.
   Provides case-insensitive lookup to enforce subject uniqueness and avoid wrong analytics. */

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    /* Finds a subject by name ignoring case to prevent duplicates (e.g. 'Math' vs 'math') from splitting statistics */
    Optional<Subject> findByNameIgnoreCase(String name);
}
