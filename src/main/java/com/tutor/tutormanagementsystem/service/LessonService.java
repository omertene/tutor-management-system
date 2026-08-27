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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/* Core business service for managing lessons (booking, editing, canceling, completing) */

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final StudentService studentService;
    private final SubjectService subjectService;
    private final AvailabilityService availabilityService;
    private final EmailService emailService;

    @Value("${teacher.notification.email}")
    private String teacherNotificationEmail;

    private static final DateTimeFormatter NOTIFICATION_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter NOTIFICATION_TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private static final long STUDENT_MIN_BOOKING_NOTICE_HOURS = 2;
    private static final long STUDENT_MIN_CANCEL_NOTICE_HOURS = 6;

    /* Teacher books a lesson for a student */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonForStudent(LessonRequest request) {
        Student student = studentService.getStudentEntity(request.studentId());

        return createLesson(student, request.subjectId(), request.date(), request.startTime(), request.endTime());
    }

    /* Student books a lesson for themselves with a minimum 2-hour advance notice check */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LessonResponse createLessonAsStudent(Long studentId, StudentLessonRequest request) {
        Student student = studentService.getStudentEntity(studentId);

        /* Block last-minute bookings less than 2 hours before the start time */
        LocalDateTime requestedStart = LocalDateTime.of(request.date(), request.startTime());
        if (requestedStart.isBefore(LocalDateTime.now().plusHours(STUDENT_MIN_BOOKING_NOTICE_HOURS))) {
            throw new SlotNotAvailableException(
                    "Lessons must be booked at least " + STUDENT_MIN_BOOKING_NOTICE_HOURS + " hours in advance");
        }

        LessonResponse response = createLesson(student, request.subjectId(), request.date(), request.startTime(), request.endTime());

        /* Send email notification to teacher only when student books by themselves */
        notifyTeacherOfNewBooking(response);

        return response;
    }

    /* Sends an email to teacher about a new student booking */
    private void notifyTeacherOfNewBooking(LessonResponse lesson) {
        String subject = "New lesson booked";
        String body = lesson.studentFirstName() + " " + lesson.studentLastName() + " booked a "
                + lesson.subjectName() + " lesson on " + lesson.date().format(NOTIFICATION_DATE_FORMAT)
                + " at " + lesson.startTime().format(NOTIFICATION_TIME_FORMAT) + "-"
                + lesson.endTime().format(NOTIFICATION_TIME_FORMAT) + ".";

        emailService.sendEmail(teacherNotificationEmail, subject, body);
    }


    /* Calculates exact price based on student hourly rate and lesson duration in minutes */
    private static BigDecimal priceForDuration(BigDecimal hourlyRate, LocalTime startTime, LocalTime endTime) {
        long minutes = java.time.Duration.between(startTime, endTime).toMinutes();
        return hourlyRate
                .multiply(BigDecimal.valueOf(minutes))
                .divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
    }

    /* Core booking logic: validates time, acquires pessimistic lock on date, and saves lesson */
    private LessonResponse createLesson(Student student, Long subjectId, LocalDate date, LocalTime startTime, LocalTime endTime) {

        Subject subject = subjectService.getSubjectEntity(subjectId);

        /* Ensure start time is strictly before end time */
        TimeValidation.requireValidRange(startTime, endTime);

        /* Pessimistic lock for this specific date to stop double-booking race conditions */
        lessonRepository.acquireDateLock(date.toEpochDay());

        /* Check if slot is open in tutor's weekly rules and overrides */
        if (!availabilityService.isTimeAvailable(date, startTime, endTime)) {
            throw new SlotNotAvailableException("This time is not available");
        }

        /* Check if another active lesson is already booked in this time range */
        boolean alreadyBooked = !lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(date, endTime, startTime, LessonStatus.CANCELLED)
                .isEmpty();

        if (alreadyBooked) {
            throw new SlotNotAvailableException("This time is already booked");
        }

        /* Build and save new scheduled lesson entity with locked-in booking price */
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


    /* Updates an existing scheduled lesson's date, time, subject, or student */
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

        /* Lock target date to safely check overlaps */
        lessonRepository.acquireDateLock(request.date().toEpochDay());

        if (!availabilityService.isTimeAvailable(request.date(), request.startTime(), request.endTime())) {
            throw new SlotNotAvailableException("This time is not available");
        }

        /* Make sure no other lesson overlaps this slot (ignore current lesson being updated) */
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

    /* Cancels a lesson with permission and time-notice checks */
    @Transactional
    public LessonResponse cancelLesson(Long lessonId, Long callerId, Role callerRole) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));

        boolean isOwner = lesson.getStudent().getId().equals(callerId);

        /* Students can only cancel their own lessons */
        if (callerRole == Role.STUDENT && !isOwner) {
            throw new LessonAccessDeniedException("You can only cancel your own lessons");
        }

        /* Completed lessons can only be canceled by the teacher */
        if (lesson.getStatus() == LessonStatus.COMPLETED && callerRole != Role.TEACHER) {
            throw new LessonAccessDeniedException("Only a teacher can cancel a completed lesson");
        }

        if (lesson.getStatus() != LessonStatus.SCHEDULED && lesson.getStatus() != LessonStatus.COMPLETED) {
            throw new InvalidLessonStateException("This lesson can't be cancelled");
        }

        /* Students must cancel at least 6 hours in advance */
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


    /* Marks a scheduled lesson as completed after its start time */
    @Transactional
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

    /* Saves private notes for teacher on a lesson */
    @Transactional
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

    /* Returns all lessons in the system for the teacher */
    public List<LessonResponse> getAllLessonsForTeacher() {
        return lessonRepository.findAll().stream()
                .map(lesson -> toResponse(lesson, true))
                .toList();
    }

    /* Returns only lessons belonging to a specific student (hiding private teacher notes) */
    public List<LessonResponse> getLessonsForStudent(Long studentId) {
        return lessonRepository.findAllByStudentId(studentId).stream()
                .map(lesson -> toResponse(lesson, false))
                .toList();
    }

    /* Returns anonymized busy time intervals for students to see calendar availability */
    public List<BusySlotResponse> getBusySlots(LocalDate startDate, LocalDate endDate) {
        return lessonRepository.findAllByStatusNotAndDateBetween(LessonStatus.CANCELLED, startDate, endDate).stream()
                .map(lesson -> new BusySlotResponse(lesson.getDate(), lesson.getStartTime(), lesson.getEndTime()))
                .toList();
    }

    /* Calculates total sum of completed lessons for a student */
    public BigDecimal sumCompletedLessonPricesForStudent(Long studentId) {
        return lessonRepository.sumLessonPricesForStudentByStatus(studentId, LessonStatus.COMPLETED);
    }

    /* Gets a lesson entity by ID or throws exception */
    public Lesson getLessonEntity(Long lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException("Lesson not found"));
    }

    /* Checks if any scheduled lesson exists in a specific date and time interval */
    public boolean hasScheduledLessonInRange(LocalDate date, LocalTime startTime, LocalTime endTime) {
        return !lessonRepository
                .findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatus(date, endTime, startTime, LessonStatus.SCHEDULED)
                .isEmpty();
    }

    /* Counts how many upcoming lessons fall into a weekly slot */
    public long countUpcomingLessonsInWeeklySlot(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
        LocalDate today = LocalDate.now();

        return lessonRepository.findAll().stream()
                .filter(lesson -> lesson.getStatus() == LessonStatus.SCHEDULED)
                .filter(lesson -> !lesson.getDate().isBefore(today))
                .filter(lesson -> lesson.getDate().getDayOfWeek() == dayOfWeek)
                .filter(lesson -> lesson.getStartTime().isBefore(endTime) && lesson.getEndTime().isAfter(startTime))
                .count();
    }

    /* Counts upcoming lessons that will lose coverage if a weekly rule is edited */
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


    /* Gets completed lessons in a date range (optionally filtered by subject) for statistics */
    public List<Lesson> getCompletedLessonsInRange(LocalDate startDate, LocalDate endDate, Long subjectId) {
        return lessonRepository.findCompletedInRange(LessonStatus.COMPLETED, startDate, endDate, subjectId);
    }

    /* Returns list of years that have at least one completed lesson for UI dropdowns */
    public List<Integer> getYearsWithCompletedLessons() {
        return lessonRepository.findDistinctYearsWithCompletedLessons(LessonStatus.COMPLETED);
    }

    /* Converts lesson duration to decimal hours (e.g. 90 minutes = 1.5 hours) */
    public double lessonHours(Lesson lesson) {
        return java.time.Duration.between(lesson.getStartTime(), lesson.getEndTime()).toMinutes() / 60.0;
    }

    /* Calculates total revenue from completed lessons for the current month */
    public BigDecimal getCompletedLessonRevenueForCurrentMonth() {
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        return lessonRepository.sumLessonPricesByStatusAndDateRange(LessonStatus.COMPLETED, startOfMonth, endOfMonth);
    }

    /* Maps Lesson entity to LessonResponse DTO (hiding notes from students) */
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
