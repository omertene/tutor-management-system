package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.dto.LessonResponse;
import com.tutor.tutormanagementsystem.dto.StudentLessonRequest;
import com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException;
import com.tutor.tutormanagementsystem.exception.LessonAccessDeniedException;
import com.tutor.tutormanagementsystem.exception.LessonNotFoundException;
import com.tutor.tutormanagementsystem.exception.SlotNotAvailableException;
import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.model.Subject;
import com.tutor.tutormanagementsystem.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final StudentService studentService;
    private final SubjectService subjectService;
    private final AvailabilityService availabilityService;


    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonForStudent(LessonRequest request) {
        Student student = studentService.getStudentEntity(request.studentId());

        return createLesson(student, request.subjectId(), request.date(), request.startTime(), request.endTime());
    }

    // student books a lesson for themselves
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonAsStudent(Long studentId, StudentLessonRequest request) {
        Student student = studentService.getStudentEntity(studentId);

        return createLesson(student, request.subjectId(), request.date(), request.startTime(), request.endTime());
    }


    private LessonResponse createLesson(Student student, Long subjectId, LocalDate date, LocalTime startTime, LocalTime endTime) {

        Subject subject = subjectService.getSubjectEntity(subjectId);

        if (startTime.isAfter(endTime)) {
            throw new InvalidTimeRangeException("Start time must be before end time");
        }


        lessonRepository.acquireDateLock(date.toEpochDay());

        if (!availabilityService.isTimeAvailable(date, startTime, endTime)) {
            throw new SlotNotAvailableException("This time is not available");
        }

        boolean alreadyBooked = !lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(date, endTime, startTime, LessonStatus.SCHEDULED)
                .isEmpty();

        if (alreadyBooked) {
            throw new SlotNotAvailableException("This time is already booked");
        }

        Lesson lesson = Lesson.builder()
                .student(student)
                .subject(subject)
                .date(date)
                .startTime(startTime)
                .endTime(endTime)
                .status(LessonStatus.SCHEDULED)
                .priceAtBooking(student.getHourlyRate())
                .build();

        lessonRepository.save(lesson);

        return toResponse(lesson, true);
    }

    // callerId/callerRole identify who is asking - a student may only cancel their own lesson,
    // a teacher may cancel any lesson
    public LessonResponse cancelLesson(Long lessonId, Long callerId, Role callerRole) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));

        boolean isOwner = lesson.getStudent().getId().equals(callerId);

        if (callerRole == Role.STUDENT && !isOwner) {
            throw new LessonAccessDeniedException("You can only cancel your own lessons");
        }

        lesson.setStatus(LessonStatus.CANCELLED);
        lessonRepository.save(lesson);

        return toResponse(lesson, callerRole == Role.TEACHER);
    }

    public List<LessonResponse> getAllLessonsForTeacher() {
        return lessonRepository.findAll().stream()
                .map(lesson -> toResponse(lesson, true))
                .toList();
    }

    public List<LessonResponse> getLessonsForStudent(Long studentId) {
        return lessonRepository.findAllByStudentId(studentId).stream()
                .map(lesson -> toResponse(lesson, false))
                .toList();
    }


    public BigDecimal sumCompletedLessonPricesForStudent(Long studentId) {
        return lessonRepository.sumLessonPricesForStudentByStatus(studentId, LessonStatus.COMPLETED);
    }


    public Lesson getLessonEntity(Long lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));
    }

    // includeNotes controls whether the teacher-only notes field is exposed
    private LessonResponse toResponse(Lesson lesson, boolean includeNotes) {
        return new LessonResponse(
                lesson.getId(),
                lesson.getStudent().getUser().getFirstName(),
                lesson.getStudent().getUser().getLastName(),
                lesson.getSubject().getName(),
                lesson.getDate(),
                lesson.getStartTime(),
                lesson.getEndTime(),
                lesson.getStatus(),
                lesson.getSubject().getId(),
                lesson.getPriceAtBooking(),
                includeNotes ? lesson.getNotes() : null
        );
    }
}
