package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
}
