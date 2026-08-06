package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.Material;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    List<Material> findAllByStudentId(Long studentId);

    List<Material> findAllByLessonId(Long lessonId);
}
