package com.tutor.tutormanagementsystem.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

// study material the teacher shares with a student - a FILE (bytes stored directly
// in the DB, no filesystem/bucket involved), a LINK (external URL), or a NOTE (plain
// text, uses only title/description). optionally tied to the lesson it covers.
//
// which fields are populated depends on `type`:
//   FILE -> fileName, contentType, data are set; url is null
//   LINK -> url is set; fileName/contentType/data are null
//   NOTE -> none of the above are set - just title/description
// this isn't enforced at the DB level (would need a CHECK constraint per type),
// so MaterialService is responsible for only setting/expecting the right fields
@Entity
@Table(name = "materials")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(updatable = false, nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    // optional - a material doesn't have to be tied to a specific lesson
    @ManyToOne
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaterialType type;

    private String url;

    private String fileName;

    private String contentType;

    @Lob
    @JdbcTypeCode(SqlTypes.VARBINARY)
    private byte[] data;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;
}
