package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LessonRequest;
import com.tutor.tutormanagementsystem.exception.SlotNotAvailableException;
import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.model.OverrideType;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.model.Subject;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.LessonRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import com.tutor.tutormanagementsystem.repository.StudentRepository;
import com.tutor.tutormanagementsystem.repository.SubjectRepository;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/* integration test against the real PostgreSQL (in CI it is the postgres service container).
   it needs a real database because the double-booking protection is a postgres advisory lock,
   which no fake can reproduce. the test has no @Transactional on purpose - the booking threads
   must see each other's committed data - so it creates its own data and deletes it afterwards.
   everything happens on one far-future date (2099), so real lessons are never touched. */

@SpringBootTest
class LessonBookingConcurrencyTest {

    private static final LocalDate DATE = LocalDate.of(2099, 1, 5);

    @Autowired
    private LessonService lessonService;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private ScheduleOverrideRepository overrideRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    private User user;
    private Student student;
    private Subject subject;
    private ScheduleOverride openHours;

    @BeforeEach
    void createTestData() {
        String unique = UUID.randomUUID().toString();

        user = userRepository.save(User.builder()
                .email("booking-test-" + unique + "@example.com")
                .password("not-a-real-password")
                .role(Role.STUDENT)
                .firstName("Test")
                .lastName("Student")
                .build());

        student = studentRepository.save(Student.builder()
                .user(user)
                .hourlyRate(new BigDecimal("100"))
                .build());

        subject = subjectRepository.save(Subject.builder().name("test-subject-" + unique).build());

        /* an ADD override opens 08:00-18:00 on this one date, so no weekly rule has to be created */
        openHours = overrideRepository.save(ScheduleOverride.builder()
                .date(DATE)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(18, 0))
                .type(OverrideType.ADD)
                .build());
    }

    @AfterEach
    void deleteTestData() {
        lessonRepository.deleteAll(lessonsOnTestDate());
        overrideRepository.delete(openHours);
        studentRepository.delete(student);
        userRepository.delete(user);
        subjectRepository.delete(subject);
    }

    private List<Lesson> lessonsOnTestDate() {
        return lessonRepository.findAll().stream()
                .filter(lesson -> lesson.getDate().equals(DATE))
                .toList();
    }

    private LessonRequest request(int fromHour, int toHour) {
        return new LessonRequest(student.getId(), subject.getId(), DATE,
                LocalTime.of(fromHour, 0), LocalTime.of(toHour, 0));
    }

    /* runs all the requests at the same moment, each in its own thread,
       and returns the exception each one ended with (null = the booking succeeded) */
    private List<Exception> bookAtTheSameTime(List<LessonRequest> requests) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(requests.size());
        CountDownLatch ready = new CountDownLatch(requests.size());
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Exception>> futures = new ArrayList<>();

        for (LessonRequest request : requests) {
            Callable<Exception> task = () -> {
                ready.countDown();
                go.await();
                try {
                    lessonService.createLessonForStudent(request);
                    return null;
                } catch (Exception e) {
                    return e;
                }
            };
            futures.add(pool.submit(task));
        }

        ready.await();
        go.countDown();

        List<Exception> results = new ArrayList<>();
        for (Future<Exception> future : futures) {
            results.add(future.get());
        }
        pool.shutdown();
        return results;
    }

    @Test
    void fiveRequestsForTheSameSlot_onlyOneBookingSucceeds() throws Exception {
        List<LessonRequest> requests = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            requests.add(request(10, 11));
        }

        List<Exception> results = bookAtTheSameTime(requests);

        long succeeded = results.stream().filter(e -> e == null).count();
        assertThat(succeeded).isEqualTo(1);
        assertThat(results.stream().filter(e -> e != null))
                .allSatisfy(e -> assertThat(e).isInstanceOf(SlotNotAvailableException.class));

        List<Lesson> saved = lessonsOnTestDate().stream()
                .filter(lesson -> lesson.getStatus() != LessonStatus.CANCELLED)
                .toList();
        assertThat(saved).hasSize(1);
    }

    /* the lock must not reject bookings that don't overlap - four back-to-back hours all succeed */
    @Test
    void fourBackToBackSlots_allSucceed() throws Exception {
        List<Exception> results = bookAtTheSameTime(List.of(
                request(10, 11), request(11, 12), request(12, 13), request(13, 14)));

        assertThat(results).containsOnlyNulls();
        assertThat(lessonsOnTestDate()).hasSize(4);
    }
}
