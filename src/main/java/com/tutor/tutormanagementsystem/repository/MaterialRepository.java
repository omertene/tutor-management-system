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

    // the three JPQL constructor-expression queries below back every "list materials"
    // endpoint. they select metadata columns directly instead of loading full Material
    // entities - a plain findAll()/findAllByX would still pull every file's bytes out
    // of the `data` column for each row even though the list view never reads them,
    // since @Lob byte[] is an eager basic mapping and @Basic(fetch = LAZY) on it is a
    // silent no-op without Hibernate bytecode enhancement, which this project doesn't
    // have configured. lesson/subject are LEFT JOINed since a material's lesson link
    // is optional - JPQL returns null for those fields when there's no lesson, same as
    // the ternaries the old Java-side mapping used to do
    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, m.student.id, m.student.user.firstName, m.student.user.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student.user LEFT JOIN m.lesson l LEFT JOIN l.subject s")
    List<MaterialResponse> findAllProjected();

    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, m.student.id, m.student.user.firstName, m.student.user.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student.user LEFT JOIN m.lesson l LEFT JOIN l.subject s " +
            "WHERE m.student.id = :studentId")
    List<MaterialResponse> findAllByStudentIdProjected(@Param("studentId") Long studentId);

    @Query("SELECT NEW com.tutor.tutormanagementsystem.dto.MaterialResponse(" +
            "m.id, m.student.id, m.student.user.firstName, m.student.user.lastName, " +
            "l.id, l.date, l.startTime, s.name, " +
            "m.title, m.description, m.type, m.url, m.fileName, m.uploadedAt) " +
            "FROM Material m JOIN m.student.user LEFT JOIN m.lesson l LEFT JOIN l.subject s " +
            "WHERE m.lesson.id = :lessonId")
    List<MaterialResponse> findAllByLessonIdProjected(@Param("lessonId") Long lessonId);
}
