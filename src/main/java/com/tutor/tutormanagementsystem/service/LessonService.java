package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.dto.LessonResponse;
import com.tutor.tutormanagementsystem.dto.MonthlyCount;
import com.tutor.tutormanagementsystem.dto.StudentLessonRequest;
import com.tutor.tutormanagementsystem.dto.SubjectStats;
import com.tutor.tutormanagementsystem.exception.InvalidLessonStateException;
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
import java.time.LocalDateTime;
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


        if (lesson.getStatus() != LessonStatus.SCHEDULED) {
            throw new InvalidLessonStateException("Only a scheduled lesson can be cancelled");
        }

        lesson.setStatus(LessonStatus.CANCELLED);
        lessonRepository.save(lesson);

        return toResponse(lesson, callerRole == Role.TEACHER);
    }


    public LessonResponse completeLesson(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));

        if (lesson.getStatus() != LessonStatus.SCHEDULED) {
            throw new InvalidLessonStateException("Only a scheduled lesson can be marked as completed");
        }

        lesson.setStatus(LessonStatus.COMPLETED);
        lessonRepository.save(lesson);

        return toResponse(lesson, true);
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


    public List<MonthlyCount> getCompletedLessonsByMonth() {
        return lessonRepository.countCompletedLessonsGroupedByMonth(LessonStatus.COMPLETED).stream()
                .map(row -> new MonthlyCount(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).intValue(),
                        ((Number) row[2]).longValue()))
                .toList();
    }

    // used by StatisticsService for the "breakdown by subject" table
    public List<SubjectStats> getCompletedLessonsBySubject() {
        return lessonRepository.summarizeCompletedLessonsBySubject(LessonStatus.COMPLETED).stream()
                .map(row -> new SubjectStats(
                        (String) row[0],
                        ((Number) row[1]).longValue(),
                        (BigDecimal) row[2]))
                .toList();
    }

    // all-time count of COMPLETED lessons
    public long getTotalCompletedLessons() {
        return lessonRepository.countByStatus(LessonStatus.COMPLETED);
    }


    // quiet hours - reminders that would naturally go out during this window get pushed
    // to QUIET_HOURS_END instead, so students don't get emailed/pinged in the middle of
    // the night. e.g. a lesson at 15:00 with a 12h-before reminder would naturally fire
    // at 03:00 - instead it fires at 08:00 that same morning
    private static final LocalTime QUIET_HOURS_START = LocalTime.of(22, 0);
    private static final LocalTime QUIET_HOURS_END = LocalTime.of(8, 0);

    public List<Lesson> getLessonsAwaitingReminder(long hoursBefore) {
        LocalDateTime now = LocalDateTime.now();

        return lessonRepository.findAllByStatusAndReminderSentFalse(LessonStatus.SCHEDULED).stream()
                .filter(lesson -> {
                    LocalDateTime lessonStart = LocalDateTime.of(lesson.getDate(), lesson.getStartTime());
                    if (!lessonStart.isAfter(now)) {
                        return false; // lesson already started/passed - never remind
                    }

                    LocalDateTime reminderTime = clampOutOfQuietHours(lessonStart.minusHours(hoursBefore));

                    // due once "now" has reached the (possibly clamped) reminder time,
                    // but only if the lesson hasn't started yet by then
                    return !now.isBefore(reminderTime);
                })
                .toList();
    }

    // if the given time falls inside quiet hours (22:00-08:00), pushes it forward to
    // 08:00 the same morning (or the next morning, if it was already past midnight)
    private LocalDateTime clampOutOfQuietHours(LocalDateTime time) {
        LocalTime timeOfDay = time.toLocalTime();

        boolean isDuringQuietHours = timeOfDay.isAfter(QUIET_HOURS_START) || timeOfDay.isBefore(QUIET_HOURS_END);

        if (!isDuringQuietHours) {
            return time;
        }

        // if it's already past midnight (e.g. 03:00), 08:00 the same day is later and correct.
        // if it's still evening (e.g. 23:00), 08:00 the same day has already passed, so it
        // needs to roll over to 08:00 the next day instead
        LocalDate clampedDate = timeOfDay.isBefore(QUIET_HOURS_END) ? time.toLocalDate() : time.toLocalDate().plusDays(1);

        return LocalDateTime.of(clampedDate, QUIET_HOURS_END);
    }

    // marks a lesson as reminded so the next scheduled check doesn't pick it up again
    public void markReminderSent(Lesson lesson) {
        lesson.setReminderSent(true);
        lessonRepository.save(lesson);
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
