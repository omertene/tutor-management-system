package com.tutor.tutormanagementsystem.service;

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
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.LessonRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/* unit test of the lesson rules - who may cancel, how much notice is needed, when a lesson can be
   completed, how the price is calculated and what a student is allowed to learn about other bookings.
   the repository and the other services are Mockito fakes, so there is no database. */

@ExtendWith(MockitoExtension.class)
class LessonServiceTest {

    private static final Long STUDENT_ID = 1L;
    private static final Long OTHER_STUDENT_ID = 2L;
    private static final Long LESSON_ID = 10L;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private StudentService studentService;

    @Mock
    private SubjectService subjectService;

    @Mock
    private AvailabilityService availabilityService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private LessonService service;

    private Student student(Long id, String rate) {
        User user = User.builder().firstName("Dana").lastName("Levi").build();
        return Student.builder().id(id).user(user).hourlyRate(new BigDecimal(rate)).build();
    }

    private Subject subject() {
        return Subject.builder().id(3L).name("Math").build();
    }

    /* a lesson owned by STUDENT_ID that starts at the given moment and lasts one hour */
    private Lesson lesson(LessonStatus status, LocalDateTime start) {
        return Lesson.builder()
                .id(LESSON_ID)
                .student(student(STUDENT_ID, "100"))
                .subject(subject())
                .date(start.toLocalDate())
                .startTime(start.toLocalTime().withSecond(0).withNano(0))
                .endTime(start.toLocalTime().withSecond(0).withNano(0).plusHours(1))
                .status(status)
                .priceAtBooking(new BigDecimal("100"))
                .build();
    }

    private void givenLesson(Lesson lesson) {
        when(lessonRepository.findById(LESSON_ID)).thenReturn(Optional.of(lesson));
    }

    /* ---------- cancelling ---------- */

    @Test
    void teacherCancelsScheduledLesson_marksItCancelled() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusMinutes(30));
        givenLesson(lesson);

        LessonResponse response = service.cancelLesson(LESSON_ID, 99L, Role.TEACHER);

        assertThat(response.status()).isEqualTo(LessonStatus.CANCELLED);
        verify(lessonRepository).save(lesson);
    }

    @Test
    void studentCancelsOwnLessonWithEnoughNotice_succeeds() {
        givenLesson(lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(2)));

        LessonResponse response = service.cancelLesson(LESSON_ID, STUDENT_ID, Role.STUDENT);

        assertThat(response.status()).isEqualTo(LessonStatus.CANCELLED);
    }

    @Test
    void studentCancelsAnotherStudentsLesson_isDenied() {
        givenLesson(lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(2)));

        assertThatThrownBy(() -> service.cancelLesson(LESSON_ID, OTHER_STUDENT_ID, Role.STUDENT))
                .isInstanceOf(LessonAccessDeniedException.class);
        verify(lessonRepository, never()).save(any());
    }

    @Test
    void studentCancelsLessonStartingInLessThanSixHours_isRejected() {
        givenLesson(lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusHours(5)));

        assertThatThrownBy(() -> service.cancelLesson(LESSON_ID, STUDENT_ID, Role.STUDENT))
                .isInstanceOf(InvalidLessonStateException.class)
                .hasMessageContaining("6 hours");
        verify(lessonRepository, never()).save(any());
    }

    @Test
    void studentCannotCancelACompletedLesson() {
        givenLesson(lesson(LessonStatus.COMPLETED, LocalDateTime.now().minusDays(1)));

        assertThatThrownBy(() -> service.cancelLesson(LESSON_ID, STUDENT_ID, Role.STUDENT))
                .isInstanceOf(LessonAccessDeniedException.class);
    }

    @Test
    void teacherCanCancelACompletedLesson() {
        givenLesson(lesson(LessonStatus.COMPLETED, LocalDateTime.now().minusDays(1)));

        LessonResponse response = service.cancelLesson(LESSON_ID, 99L, Role.TEACHER);

        assertThat(response.status()).isEqualTo(LessonStatus.CANCELLED);
    }

    @Test
    void cancellingAnAlreadyCancelledLesson_isRejected() {
        givenLesson(lesson(LessonStatus.CANCELLED, LocalDateTime.now().plusDays(2)));

        assertThatThrownBy(() -> service.cancelLesson(LESSON_ID, 99L, Role.TEACHER))
                .isInstanceOf(InvalidLessonStateException.class);
    }

    @Test
    void cancellingAnUnknownLesson_throwsNotFound() {
        when(lessonRepository.findById(LESSON_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancelLesson(LESSON_ID, 99L, Role.TEACHER))
                .isInstanceOf(LessonNotFoundException.class);
    }

    /* the teacher's private notes are hidden from the student, even in the cancel response */
    @Test
    void studentCancelResponse_hidesTheTeachersNotes() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(2));
        lesson.setNotes("private note");
        givenLesson(lesson);

        LessonResponse response = service.cancelLesson(LESSON_ID, STUDENT_ID, Role.STUDENT);

        assertThat(response.notes()).isNull();
    }

    /* ---------- completing ---------- */

    @Test
    void completingALessonThatAlreadyStarted_marksItCompleted() {
        givenLesson(lesson(LessonStatus.SCHEDULED, LocalDateTime.now().minusHours(2)));

        assertThat(service.completeLesson(LESSON_ID).status()).isEqualTo(LessonStatus.COMPLETED);
    }

    @Test
    void completingALessonThatHasNotStarted_isRejected() {
        givenLesson(lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusHours(3)));

        assertThatThrownBy(() -> service.completeLesson(LESSON_ID))
                .isInstanceOf(InvalidLessonStateException.class)
                .hasMessageContaining("before it has started");
    }

    @Test
    void completingALessonThatIsNotScheduled_isRejected() {
        givenLesson(lesson(LessonStatus.CANCELLED, LocalDateTime.now().minusHours(2)));

        assertThatThrownBy(() -> service.completeLesson(LESSON_ID))
                .isInstanceOf(InvalidLessonStateException.class);
    }

    @Test
    void notesOnACancelledLesson_areRejected() {
        givenLesson(lesson(LessonStatus.CANCELLED, LocalDateTime.now().plusDays(1)));

        assertThatThrownBy(() -> service.updateLessonNotes(LESSON_ID, "note"))
                .isInstanceOf(InvalidLessonStateException.class);
    }

    /* ---------- booking by the teacher ---------- */

    private void givenBookableSlot(Student student) {
        when(studentService.getStudentEntity(student.getId())).thenReturn(student);
        when(subjectService.getSubjectEntity(3L)).thenReturn(subject());
        when(availabilityService.isTimeAvailable(any(), any(), any())).thenReturn(true);
    }

    private LessonRequest teacherRequest(LocalTime start, LocalTime end) {
        return new LessonRequest(STUDENT_ID, 3L, LocalDate.now().plusDays(1), start, end);
    }

    @Test
    void priceIsHourlyRateTimesDuration() {
        givenBookableSlot(student(STUDENT_ID, "100"));

        service.createLessonForStudent(teacherRequest(LocalTime.of(10, 0), LocalTime.of(11, 30)));

        ArgumentCaptor<Lesson> saved = ArgumentCaptor.forClass(Lesson.class);
        verify(lessonRepository).save(saved.capture());
        assertThat(saved.getValue().getPriceAtBooking()).isEqualByComparingTo("150.00");
        assertThat(saved.getValue().getStatus()).isEqualTo(LessonStatus.SCHEDULED);
    }

    @Test
    void priceIsRoundedToTwoDecimals() {
        givenBookableSlot(student(STUDENT_ID, "100"));

        service.createLessonForStudent(teacherRequest(LocalTime.of(10, 0), LocalTime.of(10, 15)));

        ArgumentCaptor<Lesson> saved = ArgumentCaptor.forClass(Lesson.class);
        verify(lessonRepository).save(saved.capture());
        assertThat(saved.getValue().getPriceAtBooking()).isEqualByComparingTo("25.00");
    }

    @Test
    void teacherBookingATakenSlot_isToldItIsAlreadyBooked() {
        givenBookableSlot(student(STUDENT_ID, "100"));
        Lesson existing = lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(1));
        when(lessonRepository.findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(
                any(), any(), any(), eq(LessonStatus.CANCELLED))).thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.createLessonForStudent(
                teacherRequest(LocalTime.of(10, 0), LocalTime.of(11, 0))))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("already booked");
        verify(lessonRepository, never()).save(any());
    }

    @Test
    void bookingOutsideAvailability_isRejected() {
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student(STUDENT_ID, "100"));
        when(subjectService.getSubjectEntity(3L)).thenReturn(subject());
        when(availabilityService.isTimeAvailable(any(), any(), any())).thenReturn(false);

        assertThatThrownBy(() -> service.createLessonForStudent(
                teacherRequest(LocalTime.of(10, 0), LocalTime.of(11, 0))))
                .isInstanceOf(SlotNotAvailableException.class);
    }

    @Test
    void bookingOffTheQuarterHourGrid_isRejectedBeforeAnyLockOrSave() {
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student(STUDENT_ID, "100"));
        when(subjectService.getSubjectEntity(3L)).thenReturn(subject());

        assertThatThrownBy(() -> service.createLessonForStudent(
                teacherRequest(LocalTime.of(10, 10), LocalTime.of(11, 0))))
                .isInstanceOf(com.tutor.tutormanagementsystem.exception.InvalidTimeRangeException.class);
        verify(lessonRepository, never()).save(any());
    }

    /* ---------- booking by a student ---------- */

    private StudentLessonRequest studentRequest(LocalDate date, LocalTime start, LocalTime end) {
        return new StudentLessonRequest(3L, date, start, end);
    }

    @Test
    void studentBookingLessThanTwoHoursAhead_isRejected() {
        when(studentService.getStudentEntity(STUDENT_ID)).thenReturn(student(STUDENT_ID, "100"));
        LocalDateTime soon = LocalDateTime.now().plusMinutes(30);

        assertThatThrownBy(() -> service.createLessonAsStudent(STUDENT_ID,
                studentRequest(soon.toLocalDate(), soon.toLocalTime().withSecond(0).withNano(0), LocalTime.MAX)))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("2 hours");
        verify(lessonRepository, never()).save(any());
    }

    /* a student must not learn that another student has a lesson there, so "already booked"
       and "not available" produce exactly the same message for a student */
    @Test
    void studentBookingATakenSlot_getsTheGenericMessage() {
        givenBookableSlot(student(STUDENT_ID, "100"));
        Lesson existing = lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(1));
        when(lessonRepository.findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(
                any(), any(), any(), eq(LessonStatus.CANCELLED))).thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.createLessonAsStudent(STUDENT_ID,
                studentRequest(LocalDate.now().plusDays(1), LocalTime.of(10, 0), LocalTime.of(11, 0))))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessage("This time is not available");
    }

    @Test
    void studentBooking_notifiesTheTeacherByEmail() {
        givenBookableSlot(student(STUDENT_ID, "100"));

        service.createLessonAsStudent(STUDENT_ID,
                studentRequest(LocalDate.now().plusDays(1), LocalTime.of(10, 0), LocalTime.of(11, 0)));

        verify(emailService).sendEmail(any(), eq("New lesson booked"), anyString());
    }

    /* a failed notification email must never break the booking itself */
    @Test
    void emailFailure_doesNotBreakTheStudentBooking() {
        givenBookableSlot(student(STUDENT_ID, "100"));
        doThrow(new RuntimeException("smtp down")).when(emailService).sendEmail(any(), anyString(), anyString());

        assertThatCode(() -> service.createLessonAsStudent(STUDENT_ID,
                studentRequest(LocalDate.now().plusDays(1), LocalTime.of(10, 0), LocalTime.of(11, 0))))
                .doesNotThrowAnyException();
        verify(lessonRepository).save(any(Lesson.class));
    }

    @Test
    void teacherBooking_doesNotSendAnEmail() {
        givenBookableSlot(student(STUDENT_ID, "100"));

        service.createLessonForStudent(teacherRequest(LocalTime.of(10, 0), LocalTime.of(11, 0)));

        verify(emailService, never()).sendEmail(any(), any(), any());
    }

    /* ---------- editing ---------- */

    @Test
    void editingALessonThatIsNotScheduled_isRejected() {
        givenLesson(lesson(LessonStatus.COMPLETED, LocalDateTime.now().minusDays(1)));

        assertThatThrownBy(() -> service.updateLesson(LESSON_ID,
                teacherRequest(LocalTime.of(10, 0), LocalTime.of(11, 0))))
                .isInstanceOf(InvalidLessonStateException.class);
    }

    /* moving a lesson inside its own time must not count as a clash with itself */
    @Test
    void editingALesson_ignoresTheLessonItself_whenCheckingOverlaps() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(1));
        givenLesson(lesson);
        givenBookableSlot(student(STUDENT_ID, "100"));
        when(lessonRepository.findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(
                any(), any(), any(), eq(LessonStatus.CANCELLED))).thenReturn(List.of(lesson));

        assertThatCode(() -> service.updateLesson(LESSON_ID,
                teacherRequest(LocalTime.of(10, 0), LocalTime.of(11, 0))))
                .doesNotThrowAnyException();
    }

    @Test
    void editingALesson_intoAnotherLessonsSlot_isRejected() {
        Lesson lesson = lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(1));
        givenLesson(lesson);
        givenBookableSlot(student(STUDENT_ID, "100"));
        Lesson other = lesson(LessonStatus.SCHEDULED, LocalDateTime.now().plusDays(1));
        other.setId(77L);
        when(lessonRepository.findAllByDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNot(
                any(), any(), any(), eq(LessonStatus.CANCELLED))).thenReturn(List.of(other));

        assertThatThrownBy(() -> service.updateLesson(LESSON_ID,
                teacherRequest(LocalTime.of(10, 0), LocalTime.of(11, 0))))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("already booked");
    }
}
