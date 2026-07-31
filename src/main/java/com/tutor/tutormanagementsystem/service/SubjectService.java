package com.tutor.tutormanagementsystem.service;


import com.tutor.tutormanagementsystem.dto.SubjectRequest;
import com.tutor.tutormanagementsystem.dto.SubjectResponse;
import com.tutor.tutormanagementsystem.exception.DuplicateSubjectException;
import com.tutor.tutormanagementsystem.model.Subject;
import com.tutor.tutormanagementsystem.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@RequiredArgsConstructor
@Service
public class SubjectService {

    private final SubjectRepository subjectRepository;

    public SubjectResponse createSubject(SubjectRequest request) {

        if (subjectRepository.findByName(request.name()).isPresent()) {
            throw new DuplicateSubjectException("Subject already exists");
        }

        Subject subject = Subject.builder().name(request.name()).build();
        subjectRepository.save(subject);

        return new SubjectResponse(subject.getId(), subject.getName());
    }

    public List<SubjectResponse> getAllSubjects() {
        return subjectRepository.findAll().stream().map(subject -> new SubjectResponse(subject.getId(), subject.getName())).toList();
    }
}
