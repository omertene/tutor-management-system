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

@RequiredArgsConstructor
@Service
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;

    @Transactional
    public SubjectResponse createSubject(SubjectRequest request) {

        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestDataException("Subject name is required");
        }

        if (subjectRepository.findByName(request.name()).isPresent()) {
            throw new DuplicateSubjectException("Subject already exists");
        }

        Subject subject = Subject.builder().name(request.name()).build();
        subjectRepository.save(subject);

        return new SubjectResponse(subject.getId(), subject.getName());
    }

    @Transactional
    public void deleteSubject(Long subjectId) {
        Subject subject = getSubjectEntity(subjectId);

        long lessonCount = lessonRepository.countBySubjectId(subjectId);
        if (lessonCount > 0) {
            throw new SubjectInUseException(
                    lessonCount + " lesson(s) use this subject - it can't be deleted");
        }

        subjectRepository.delete(subject);
    }

    public List<SubjectResponse> getAllSubjects() {
        return subjectRepository.findAll().stream().map(subject -> new SubjectResponse(subject.getId(), subject.getName())).toList();
    }

    // returns the raw entity for other services (e.g. LessonService) that need
    // to work with the Subject entity directly instead of its DTO projection
    public Subject getSubjectEntity(Long subjectId) {
        return subjectRepository.findById(subjectId)
                .orElseThrow(() -> new SubjectNotFoundException("Subject not found"));
    }
}
