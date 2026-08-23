package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.BusySlotResponse;
import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.dto.LessonResponse;
import com.tutor.tutormanagementsystem.dto.StudentLessonRequest;
import com.tutor.tutormanagementsystem.exception.InvalidLessonStateException;
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

    private static final long STUDENT_MIN_BOOKING_NOTICE_HOURS = 2;
    private static final long STUDENT_MIN_CANCEL_NOTICE_HOURS = 6;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonAsStudent(Long studentId, StudentLessonRequest request) {
        Student student = studentService.getStudentEntity(studentId);

        LocalDateTime requestedStart = LocalDateTime.of(request.date(), request.startTime());
        if (requestedStart.isBefore(LocalDateTime.now().plusHours(STUDENT_MIN_BOOKING_NOTICE_HOURS))) {
            throw new SlotNotAvailableException(
                    "Lessons must be booked at least " + STUDENT_MIN_BOOKING_NOTICE_HOURS + " hours in advance");
        }

        return createLesson(student, request.subjectId(), request.date(), request.startTime(), request.endTime());
    }


    // price = hourly rate x duration in hours, not the flat hourly rate - a 30-minute
    // lesson costs half the rate, a 3-hour lesson costs 3x it. computed from whole
    // minutes (not Duration/double) so the result is exact BigDecimal money math
    private static BigDecimal priceForDuration(BigDecimal hourlyRate, LocalTime startTime, LocalTime endTime) {
        long minutes = java.time.Duration.between(startTime, endTime).toMinutes();
        return hourlyRate
                .multiply(BigDecimal.valueOf(minutes))
                .divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
    }

    private LessonResponse createLesson(Student student, Long subjectId, LocalDate date, LocalTime startTime, LocalTime endTime) {

        Subject subject = subjectService.getSubjectEntity(subjectId);

        TimeValidation.requireValidRange(startTime, endTime);

        lessonRepository.acquireDateLock(date.toEpochDay());

        if (!availabilityService.isTimeAvailable(date, startTime, endTime)) {
            throw new SlotNotAvailableException("This time is not available");
        }

        boolean alreadyBooked = !lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(date, endTime, startTime, LessonStatus.CANCELLED)
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
                .priceAtBooking(priceForDuration(student.getHourlyRate(), startTime, endTime))
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

        TimeValidation.requireValidRange(request.startTime(), request.endTime());

        Student student = studentService.getStudentEntity(request.studentId());
        Subject subject = subjectService.getSubjectEntity(request.subjectId());

        lessonRepository.acquireDateLock(request.date().toEpochDay());

        if (!availabilityService.isTimeAvailable(request.date(), request.startTime(), request.endTime())) {
            throw new SlotNotAvailableException("This time is not available");
        }

        boolean alreadyBooked = lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(
                        request.date(), request.endTime(), request.startTime(), LessonStatus.CANCELLED)
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
        lesson.setPriceAtBooking(priceForDuration(student.getHourlyRate(), request.startTime(), request.endTime()));

        lessonRepository.save(lesson);

        return toResponse(lesson, true);
    }

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

        if (callerRole == Role.STUDENT) {
            LocalDateTime lessonStart = LocalDateTime.of(lesson.getDate(), lesson.getStartTime());
            if (lessonStart.isBefore(LocalDateTime.now().plusHours(STUDENT_MIN_CANCEL_NOTICE_HOURS))) {
                throw new InvalidLessonStateException(
                        "Lessons can only be cancelled at least " + STUDENT_MIN_CANCEL_NOTICE_HOURS + " hours in advance");
            }
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

    // teacher-only notes about a lesson (e.g. what was covered) - never shown to the
    // student, same privacy rule toResponse already enforces for reading them.
    // allowed on any lesson except a cancelled one, since there's nothing meaningful
    // left to annotate about a lesson that never happened
    public LessonResponse updateLessonNotes(Long lessonId, String notes) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));

        if (lesson.getStatus() == LessonStatus.CANCELLED) {
            throw new InvalidLessonStateException("Can't add notes to a cancelled lesson");
        }

        lesson.setNotes(notes);
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

    // every booked (SCHEDULED or COMPLETED) lesson's date/time within the given range
    // across every student, with no student-identifying info - lets a student see
    // which slots are already taken by someone else (grayed out on their own schedule
    // view) without exposing whose lesson it is or what subject it's for. scoped to a
    // date range (the caller passes the visible week) instead of loading every lesson
    // ever booked - this endpoint is hit on every student schedule page load
    public List<BusySlotResponse> getBusySlots(LocalDate startDate, LocalDate endDate) {
        return lessonRepository.findAllByStatusNotAndDateBetween(LessonStatus.CANCELLED, startDate, endDate).stream()
                .map(lesson -> new BusySlotResponse(lesson.getDate(), lesson.getStartTime(), lesson.getEndTime()))
                .toList();
    }


    public BigDecimal sumCompletedLessonPricesForStudent(Long studentId) {
        return lessonRepository.sumLessonPricesForStudentByStatus(studentId, LessonStatus.COMPLETED);
    }


    public Lesson getLessonEntity(Long lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));
    }

    public boolean hasScheduledLessonInRange(LocalDate date, LocalTime startTime, LocalTime endTime) {
        return !lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(date, endTime, startTime, LessonStatus.SCHEDULED)
                .isEmpty();
    }

    public long countUpcomingLessonsInWeeklySlot(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
        LocalDate today = LocalDate.now();

        return lessonRepository.findAll().stream()
                .filter(lesson -> lesson.getStatus() == LessonStatus.SCHEDULED)
                .filter(lesson -> !lesson.getDate().isBefore(today))
                .filter(lesson -> lesson.getDate().getDayOfWeek() == dayOfWeek)
                .filter(lesson -> lesson.getStartTime().isBefore(endTime) && lesson.getEndTime().isAfter(startTime))
                .count();
    }

    public long countUpcomingLessonsLosingCoverage(
            DayOfWeek dayOfWeek, LocalTime oldStartTime, LocalTime oldEndTime,
            DayOfWeek newDayOfWeek, LocalTime newStartTime, LocalTime newEndTime) {
        LocalDate today = LocalDate.now();

        return lessonRepository.findAll().stream()
                .filter(lesson -> lesson.getStatus() == LessonStatus.SCHEDULED)
                .filter(lesson -> !lesson.getDate().isBefore(today))
                .filter(lesson -> lesson.getDate().getDayOfWeek() == dayOfWeek)
                .filter(lesson -> lesson.getStartTime().isBefore(oldEndTime) && lesson.getEndTime().isAfter(oldStartTime))
                .filter(lesson -> {
                    boolean stillCovered = lesson.getDate().getDayOfWeek() == newDayOfWeek
                            && lesson.getStartTime().isBefore(newEndTime) && lesson.getEndTime().isAfter(newStartTime);
                    return !stillCovered;
                })
                .count();
    }


    // every COMPLETED lesson in the given range, optionally scoped to one subject -
    // the single fetch StatisticsService aggregates into KPIs, the subject table,
    // and the top-students table for the unified statistics dashboard
    public List<Lesson> getCompletedLessonsInRange(LocalDate startDate, LocalDate endDate, Long subjectId) {
        return lessonRepository.findCompletedInRange(LessonStatus.COMPLETED, startDate, endDate, subjectId);
    }

    // every year that has at least one completed lesson - powers the statistics
    // dashboard's year picker (Month mode needs a year too, Year mode picks
    // straight from this list) so an empty year is never offered
    public List<Integer> getYearsWithCompletedLessons() {
        return lessonRepository.findDistinctYearsWithCompletedLessons(LessonStatus.COMPLETED);
    }

    // hours a lesson lasted, as a double (e.g. 1.5 for a 90-minute lesson) - the
    // common unit used throughout the statistics dashboard for "total hours" and
    // effective hourly rate
    public double lessonHours(Lesson lesson) {
        return java.time.Duration.between(lesson.getStartTime(), lesson.getEndTime()).toMinutes() / 60.0;
    }

    // total price of COMPLETED lessons that happened this calendar month - "revenue this
    // month" means work actually done this month, not payments received this month.
    // used by the teacher dashboard's revenue card (GET /teacher/revenue/current-month)
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
