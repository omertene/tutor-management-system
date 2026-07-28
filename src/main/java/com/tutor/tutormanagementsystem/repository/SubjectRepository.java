package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
}
