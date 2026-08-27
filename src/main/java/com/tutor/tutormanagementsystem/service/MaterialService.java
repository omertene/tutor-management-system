package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.AddLinkRequest;
import com.tutor.tutormanagementsystem.dto.AddNoteRequest;
import com.tutor.tutormanagementsystem.dto.MaterialResponse;
import com.tutor.tutormanagementsystem.exception.InvalidMaterialException;
import com.tutor.tutormanagementsystem.exception.LessonAccessDeniedException;
import com.tutor.tutormanagementsystem.exception.MaterialNotFoundException;
import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.model.Material;
import com.tutor.tutormanagementsystem.model.MaterialType;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

@Service
@RequiredArgsConstructor

/* Service for managing learning materials (files, external links, and text notes) */

public class MaterialService {

    private final MaterialRepository materialRepository;
    private final StudentService studentService;
    private final LessonService lessonService;


    /* Returns all learning materials belonging to a specific student using DB projection */
    public List<MaterialResponse> getMaterialsForStudent(Long studentId) {
        return materialRepository.findAllByStudentIdProjected(studentId);
    }

    /* Returns every material across all students for the teacher's main materials view */
    public List<MaterialResponse> getAllMaterials() {
        return materialRepository.findAllProjected();
    }

    /* Returns materials for a specific lesson with student ownership validation */
    public List<MaterialResponse> getMaterialsForLesson(Long lessonId, Long callerId, Role callerRole) {
        Lesson lesson = lessonService.getLessonEntity(lessonId);

        boolean isOwner = lesson.getStudent().getId().equals(callerId);

        /* Block students from viewing materials of lessons that belong to others */
        if (callerRole == Role.STUDENT && !isOwner) {
            throw new LessonAccessDeniedException("You can only view materials for your own lessons");
        }

        return materialRepository.findAllByLessonIdProjected(lessonId);
    }


    /* Teacher attaches an external web link for a student, optionally tied to a lesson */
    @Transactional
    public MaterialResponse addLink(AddLinkRequest request) {

        if (request.title() == null || request.title().isBlank()) {
            throw new InvalidMaterialException("Title is required");
        }

        if (request.url() == null || request.url().isBlank()) {
            throw new InvalidMaterialException("URL is required");
        }

        /* Prevent XSS vulnerabilities by strictly allowing only http and https protocols */
        String url = request.url().trim();
        String lowerUrl = url.toLowerCase();
        if (!lowerUrl.startsWith("http://") && !lowerUrl.startsWith("https://")) {
            throw new InvalidMaterialException("Link must start with http:// or https://");
        }

        Material material = newMaterialFor(request.studentId(), request.lessonId(), request.title(), request.description())
                .type(MaterialType.LINK)
                .url(url)
                .build();

        materialRepository.save(material);

        return toResponse(material);
    }

    /* Teacher attaches a plain text note for a student, optionally tied to a lesson */
    @Transactional
    public MaterialResponse addNote(AddNoteRequest request) {

        if (request.title() == null || request.title().isBlank()) {
            throw new InvalidMaterialException("Title is required");
        }

        if (request.description() == null || request.description().isBlank()) {
            throw new InvalidMaterialException("Note description is required");
        }

        Material material = newMaterialFor(request.studentId(), request.lessonId(), request.title(), request.description())
                .type(MaterialType.NOTE)
                .build();

        materialRepository.save(material);

        return toResponse(material);
    }

    /* Teacher uploads a binary file for a student, optionally tied to a lesson */
    @Transactional
    public MaterialResponse uploadFile(Long studentId, Long lessonId, String title, String description, MultipartFile file) {

        if (title == null || title.isBlank()) {
            throw new InvalidMaterialException("Title is required");
        }

        if (file == null || file.isEmpty()) {
            throw new InvalidMaterialException("A file is required");
        }

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded file", e);
        }

        Material material = newMaterialFor(studentId, lessonId, title, description)
                .type(MaterialType.FILE)
                .fileName(file.getOriginalFilename())
                .contentType(file.getContentType())
                .data(data)
                .build();

        materialRepository.save(material);

        return toResponse(material);
    }

    /* Returns raw material entity for file streaming with student ownership verification */
    public Material getMaterialEntity(Long materialId, Long callerId, Role callerRole) {
        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new MaterialNotFoundException("Material not found"));

        boolean isOwner = material.getStudent().getId().equals(callerId);

        /* Block students from downloading files belonging to other students */
        if (callerRole == Role.STUDENT && !isOwner) {
            throw new LessonAccessDeniedException("You can only download your own materials");
        }

        if (material.getType() != MaterialType.FILE) {
            throw new InvalidMaterialException("Only file materials can be downloaded");
        }

        return material;
    }

    /* Deletes a material entity completely from database */
    @Transactional
    public void deleteMaterial(Long materialId) {

        if (!materialRepository.existsById(materialId)) {
            throw new MaterialNotFoundException("Material not found");
        }

        materialRepository.deleteById(materialId);
    }


    /* Helper method to build common material attributes and prevent attaching to canceled lessons */
    private Material.MaterialBuilder newMaterialFor(Long studentId, Long lessonId, String title, String description) {
        Student student = studentService.getStudentEntity(studentId);

        Lesson lesson = lessonId != null
                ? lessonService.getLessonEntity(lessonId)
                : null;

        /* Prevent attaching study materials to a canceled lesson */
        if (lesson != null && lesson.getStatus() == LessonStatus.CANCELLED) {
            throw new InvalidMaterialException("Can't attach a material to a cancelled lesson");
        }

        return Material.builder()
                .student(student)
                .lesson(lesson)
                .title(title)
                .description(description);
    }

    /* Maps Material entity to MaterialResponse DTO */
    private MaterialResponse toResponse(Material material) {
        Lesson lesson = material.getLesson();

        return new MaterialResponse(
                material.getId(),
                material.getStudent().getId(),
                material.getStudent().getUser().getFirstName(),
                material.getStudent().getUser().getLastName(),
                lesson != null ? lesson.getId() : null,
                lesson != null ? lesson.getDate() : null,
                lesson != null ? lesson.getStartTime() : null,
                lesson != null ? lesson.getSubject().getName() : null,
                material.getTitle(),
                material.getDescription(),
                material.getType(),
                material.getUrl(),
                material.getFileName(),
                material.getUploadedAt()
        );
    }
}
