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
import java.time.DayOfWeek;
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


    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse updateLesson(Long lessonId, LessonRequest request) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));

        if (lesson.getStatus() != LessonStatus.SCHEDULED) {
            throw new InvalidLessonStateException("Only a scheduled lesson can be edited");
        }

        if (request.startTime().isAfter(request.endTime())) {
            throw new InvalidTimeRangeException("Start time must be before end time");
        }

        Student student = studentService.getStudentEntity(request.studentId());
        Subject subject = subjectService.getSubjectEntity(request.subjectId());

        lessonRepository.acquireDateLock(request.date().toEpochDay());

        if (!availabilityService.isTimeAvailable(request.date(), request.startTime(), request.endTime())) {
            throw new SlotNotAvailableException("This time is not available");
        }

        boolean alreadyBooked = lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(
                        request.date(), request.endTime(), request.startTime(), LessonStatus.SCHEDULED)
                .stream()
                .anyMatch(other -> !other.getId().equals(lessonId));

        if (alreadyBooked) {
            throw new SlotNotAvailableException("This time is already booked");
        }

        lesson.setStudent(student);
        lesson.setSubject(subject);
        lesson.setDate(request.date());
        lesson.setStartTime(request.startTime());
        lesson.setEndTime(request.endTime());
        lesson.setPriceAtBooking(student.getHourlyRate());

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


        if (lesson.getStatus() == LessonStatus.COMPLETED && callerRole != Role.TEACHER) {
            throw new LessonAccessDeniedException("Only a teacher can cancel a completed lesson");
        }

        if (lesson.getStatus() != LessonStatus.SCHEDULED && lesson.getStatus() != LessonStatus.COMPLETED) {
            throw new InvalidLessonStateException("This lesson can't be cancelled");
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

        LocalDateTime lessonStart = LocalDateTime.of(lesson.getDate(), lesson.getStartTime());
        if (lessonStart.isAfter(LocalDateTime.now())) {
            throw new InvalidLessonStateException("Cannot mark a lesson as completed before it has started");
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

    // is there a SCHEDULED lesson overlapping this date/time range - used by
    // ScheduleOverrideService to stop a BLOCK override from being created on top
    // of a real booked lesson
    public boolean hasScheduledLessonInRange(LocalDate date, LocalTime startTime, LocalTime endTime) {
        return !lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(date, endTime, startTime, LessonStatus.SCHEDULED)
                .isEmpty();
    }

    // count of upcoming SCHEDULED lessons that fall on the given day-of-week and
    // overlap the given time range - used by ScheduleRuleService to warn a teacher
    // before deleting a rule that still has future lessons sitting inside it
    public long countUpcomingLessonsInWeeklySlot(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
        LocalDate today = LocalDate.now();

        return lessonRepository.findAll().stream()
                .filter(lesson -> lesson.getStatus() == LessonStatus.SCHEDULED)
                .filter(lesson -> !lesson.getDate().isBefore(today))
                .filter(lesson -> lesson.getDate().getDayOfWeek() == dayOfWeek)
                .filter(lesson -> lesson.getStartTime().isBefore(endTime) && lesson.getEndTime().isAfter(startTime))
                .count();
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

    // total price of COMPLETED lessons that happened this calendar month - "revenue this
    // month" means work actually done this month, not payments received this month
    public BigDecimal getCompletedLessonRevenueForCurrentMonth() {
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        return lessonRepository.sumLessonPricesByStatusAndDateRange(LessonStatus.COMPLETED, startOfMonth, endOfMonth);
    }



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
                lesson.getStudent().getId(),
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
