package com.tutor.tutormanagementsystem.service;


import com.tutor.tutormanagementsystem.dto.SubjectRequest;
import com.tutor.tutormanagementsystem.dto.SubjectResponse;
import com.tutor.tutormanagementsystem.exception.DuplicateSubjectException;
import com.tutor.tutormanagementsystem.exception.InvalidRequestDataException;
import com.tutor.tutormanagementsystem.exception.SubjectInUseException;
import com.tutor.tutormanagementsystem.exception.SubjectNotFoundException;
import com.tutor.tutormanagementsystem.model.Subject;
import com.tutor.tutormanagementsystem.repository.LessonRepository;
import com.tutor.tutormanagementsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/* Service for managing study subjects and enforcing referential integrity on deletions */

@RequiredArgsConstructor
@Service
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;

    /* Creates a new study subject with input trimming and case-insensitive uniqueness validation */
    @Transactional
    public SubjectResponse createSubject(SubjectRequest request) {

        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestDataException("Subject name is required");
        }

        /* Strip surrounding whitespace while keeping the original casing for display */
        String name = request.name().trim();

        /* Prevent duplicate subject names regardless of letter case */
        if (subjectRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new DuplicateSubjectException("Subject already exists");
        }

        Subject subject = Subject.builder().name(name).build();
        subjectRepository.save(subject);

        return new SubjectResponse(subject.getId(), subject.getName());
    }



    /* Deletes a subject only if it has no associated lessons, preserving referential integrity */
    @Transactional
    public void deleteSubject(Long subjectId) {
        Subject subject = getSubjectEntity(subjectId);

        /* Prevent deletion if historical or upcoming lessons are linked to this subject */
        long lessonCount = lessonRepository.countBySubjectId(subjectId);
        if (lessonCount > 0) {
            throw new SubjectInUseException(
                    lessonCount + " lesson(s) use this subject - it can't be deleted");
        }

        subjectRepository.delete(subject);
    }

    /* Returns all available subjects formatted as response DTOs */
    public List<SubjectResponse> getAllSubjects() {
        return subjectRepository.findAll().stream().map(subject -> new SubjectResponse(subject.getId(), subject.getName())).toList();
    }

    /* Fetches raw subject entity for internal domain service operations */
    public Subject getSubjectEntity(Long subjectId) {
        return subjectRepository.findById(subjectId)
                .orElseThrow(() -> new SubjectNotFoundException("Subject not found"));
    }
}
