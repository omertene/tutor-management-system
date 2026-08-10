package com.tutor.tutormanagementsystem.controller;

import com.tutor.tutormanagementsystem.dto.AddLinkRequest;
import com.tutor.tutormanagementsystem.dto.AddNoteRequest;
import com.tutor.tutormanagementsystem.dto.MaterialResponse;
import com.tutor.tutormanagementsystem.model.Material;
import com.tutor.tutormanagementsystem.security.AuthenticatedUser;
import com.tutor.tutormanagementsystem.service.MaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;

    // teacher adds a link
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/teacher/materials/link")
    public ResponseEntity<MaterialResponse> addLink(@RequestBody AddLinkRequest request) {
        return ResponseEntity.ok(materialService.addLink(request));
    }

    // teacher adds a plain text note
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/teacher/materials/note")
    public ResponseEntity<MaterialResponse> addNote(@RequestBody AddNoteRequest request) {
        return ResponseEntity.ok(materialService.addNote(request));
    }

    // teacher uploads a file.
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping(value = "/teacher/materials/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MaterialResponse> uploadFile(
            @RequestParam Long studentId,
            @RequestParam(required = false) Long lessonId,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam MultipartFile file) {
        return ResponseEntity.ok(materialService.uploadFile(studentId, lessonId, title, description, file));
    }

    // student views their own materials
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student/materials")
    public ResponseEntity<List<MaterialResponse>> getOwnMaterials(@AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(materialService.getMaterialsForStudent(caller.id()));
    }

    // teacher views a given student's materials
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/students/{studentId}/materials")
    public ResponseEntity<List<MaterialResponse>> getMaterialsForStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(materialService.getMaterialsForStudent(studentId));
    }

    // materials attached to a specific lesson - available to both roles, but a student
    // may only view materials for their own lesson (enforced in MaterialService)
    @PreAuthorize("hasAnyRole('TEACHER', 'STUDENT')")
    @GetMapping("/lessons/{lessonId}/materials")
    public ResponseEntity<List<MaterialResponse>> getMaterialsForLesson(
            @PathVariable Long lessonId,
            @AuthenticationPrincipal AuthenticatedUser caller) {
        return ResponseEntity.ok(materialService.getMaterialsForLesson(lessonId, caller.id(), caller.role()));
    }

    // downloads a FILE-type material's actual bytes. tely excludes the
    @PreAuthorize("hasAnyRole('TEACHER', 'STUDENT')")
    @GetMapping("/materials/{id}/download")
    public ResponseEntity<byte[]> downloadFile(@PathVariable("id") Long materialId) {
        Material material = materialService.getMaterialEntity(materialId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(material.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + material.getFileName() + "\"")
                .body(material.getData());
    }

    @PreAuthorize("hasRole('TEACHER')")
    @DeleteMapping("/teacher/materials/{id}")
    public ResponseEntity<Void> deleteMaterial(@PathVariable("id") Long materialId) {
        materialService.deleteMaterial(materialId);
        return ResponseEntity.noContent().build();
    }
}
