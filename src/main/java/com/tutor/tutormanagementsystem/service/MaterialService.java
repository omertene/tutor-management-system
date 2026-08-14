package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.AddLinkRequest;
import com.tutor.tutormanagementsystem.dto.AddNoteRequest;
import com.tutor.tutormanagementsystem.dto.MaterialResponse;
import com.tutor.tutormanagementsystem.exception.InvalidMaterialException;
import com.tutor.tutormanagementsystem.exception.LessonAccessDeniedException;
import com.tutor.tutormanagementsystem.exception.MaterialNotFoundException;
import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.Material;
import com.tutor.tutormanagementsystem.model.MaterialType;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final StudentService studentService;
    private final LessonService lessonService;

    public List<MaterialResponse> getMaterialsForStudent(Long studentId) {
        return materialRepository.findAllByStudentId(studentId).stream()
                .map(this::toResponse)
                .toList();
    }

    // teacher views every material across every student at once - the default
    // "materials" view, instead of requiring a student to be picked first
    public List<MaterialResponse> getAllMaterials() {
        return materialRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    // callerId/callerRole identify who is asking, same pattern as LessonService.cancelLesson.
    // a teacher may view materials for any lesson; a student may only view materials for
    // their own lesson - without this check, any logged-in student could see another
    // student's materials by guessing/trying a different lessonId
    public List<MaterialResponse> getMaterialsForLesson(Long lessonId, Long callerId, Role callerRole) {
        Lesson lesson = lessonService.getLessonEntity(lessonId);

        boolean isOwner = lesson.getStudent().getId().equals(callerId);

        if (callerRole == Role.STUDENT && !isOwner) {
            throw new LessonAccessDeniedException("You can only view materials for your own lessons");
        }

        return materialRepository.findAllByLessonId(lessonId).stream()
                .map(this::toResponse)
                .toList();
    }

    // teacher attaches an external URL  to a student, optionally tied to a specific lesson
    public MaterialResponse addLink(AddLinkRequest request) {

        if (request.url() == null || request.url().isBlank()) {
            throw new InvalidMaterialException("URL is required");
        }

        Material material = newMaterialFor(request.studentId(), request.lessonId(), request.title(), request.description())
                .type(MaterialType.LINK)
                .url(request.url())
                .build();

        materialRepository.save(material);

        return toResponse(material);
    }

    // teacher attaches a plain text note to a student, optionally tied to specific lesson
    public MaterialResponse addNote(AddNoteRequest request) {

        if (request.description() == null || request.description().isBlank()) {
            throw new InvalidMaterialException("Note description is required");
        }

        Material material = newMaterialFor(request.studentId(), request.lessonId(), request.title(), request.description())
                .type(MaterialType.NOTE)
                .build();

        materialRepository.save(material);

        return toResponse(material);
    }

    // teacher uploads an actual file for a student, optionally tied to a specific lesson.
    public MaterialResponse uploadFile(Long studentId, Long lessonId, String title, String description, MultipartFile file) {

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

    // returns the raw entity (not the DTO) because the controller needs the actual
    // bytes/fileName/contentType to stream back
    public Material getMaterialEntity(Long materialId) {
        return materialRepository.findById(materialId)
                .orElseThrow(() -> new MaterialNotFoundException("Material not found"));
    }

    // teacher deletes a material - hard delete
    public void deleteMaterial(Long materialId) {

        if (!materialRepository.existsById(materialId)) {
            throw new MaterialNotFoundException("Material not found");
        }

        materialRepository.deleteById(materialId);
    }


    private Material.MaterialBuilder newMaterialFor(Long studentId, Long lessonId, String title, String description) {
        Student student = studentService.getStudentEntity(studentId);

        Lesson lesson = lessonId != null
                ? lessonService.getLessonEntity(lessonId)
                : null;

        return Material.builder()
                .student(student)
                .lesson(lesson)
                .title(title)
                .description(description);
    }

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
