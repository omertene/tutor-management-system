package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.dto.MaterialResponse;
import com.tutor.tutormanagementsystem.model.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// handles DB access for the Material table (files/links/notes shared with students)
public interface MaterialRepository extends JpaRepository<Material, Long> {

    /* all materials for one student, full entity (includes file bytes if it's a FILE) */
    List<Material> findAllByStudentId(Long studentId);

    /* all materials linked to one lesson, full entity */
    List<Material> findAllByLessonId(Long lessonId);

    /* returns every material as a MaterialResponse DTO instead of the full entity, so
       list views don't drag the file bytes (`data` column) into memory for nothing */
    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, st.id, u.firstName, u.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student st JOIN st.user u LEFT JOIN m.lesson l LEFT JOIN l.subject s")
    List<MaterialResponse> findAllProjected();

    /* same DTO projection as findAllProjected, scoped to one student */
    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, st.id, u.firstName, u.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student st JOIN st.user u LEFT JOIN m.lesson l LEFT JOIN l.subject s" +
            " WHERE st.id = :studentId")
    List<MaterialResponse> findAllByStudentIdProjected(@Param("studentId") Long studentId);

    /* same DTO projection as findAllProjected, scoped to one lesson */
    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, st.id, u.firstName, u.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student st JOIN st.user u LEFT JOIN m.lesson l LEFT JOIN l.subject s" +
            " WHERE l.id = :lessonId")
    List<MaterialResponse> findAllByLessonIdProjected(@Param("lessonId") Long lessonId);
}
