package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.dto.MaterialResponse;
import com.tutor.tutormanagementsystem.model.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    List<Material> findAllByStudentId(Long studentId);

    List<Material> findAllByLessonId(Long lessonId);

    // We select specific metadata fields (DTO projection) instead of full entities
    // to avoid loading heavy file bytes (`data` column) into memory for simple list views.
    // Using LEFT JOIN for lesson/subject since a material doesn't have to be linked to a specific lesson.
    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, st.id, u.firstName, u.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student st JOIN st.user u LEFT JOIN m.lesson l LEFT JOIN l.subject s")
    List<MaterialResponse> findAllProjected();

    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, st.id, u.firstName, u.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student st JOIN st.user u LEFT JOIN m.lesson l LEFT JOIN l.subject s" +
            " WHERE st.id = :studentId")
    List<MaterialResponse> findAllByStudentIdProjected(@Param("studentId") Long studentId);

    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, st.id, u.firstName, u.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student st JOIN st.user u LEFT JOIN m.lesson l LEFT JOIN l.subject s" +
            " WHERE l.id = :lessonId")
    List<MaterialResponse> findAllByLessonIdProjected(@Param("lessonId") Long lessonId);
}
