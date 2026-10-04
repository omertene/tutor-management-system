package com.tutor.tutormanagementsystem.config;

import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.model.Material;
import com.tutor.tutormanagementsystem.model.MaterialType;
import com.tutor.tutormanagementsystem.model.OverrideType;
import com.tutor.tutormanagementsystem.model.Payment;
import com.tutor.tutormanagementsystem.model.PaymentMethod;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.ScheduleOverride;
import com.tutor.tutormanagementsystem.model.ScheduleRule;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.model.Subject;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.LessonRepository;
import com.tutor.tutormanagementsystem.repository.MaterialRepository;
import com.tutor.tutormanagementsystem.repository.PaymentRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleOverrideRepository;
import com.tutor.tutormanagementsystem.repository.ScheduleRuleRepository;
import com.tutor.tutormanagementsystem.repository.StudentRepository;
import com.tutor.tutormanagementsystem.repository.SubjectRepository;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/* showcase mode only (DEMO_ENABLED=true): fills an empty database with made-up students, lessons,
   payments and materials, and every few hours wipes and recreates them so the demo always looks
   healthy no matter what visitors did.

   safety rules, so this can never touch real data:
   - nothing runs unless demo mode is on
   - it only ever deletes when EVERY student has an @demo.example email; one real student and it refuses
   - the teacher account is never touched
   - the reminder flag is pre-set on every demo lesson, so no emails are attempted to the fake addresses */
@Component
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    /* reserved example domain: it can never belong to a real person, which is what makes the wipe guard safe */
    private static final String DEMO_EMAIL_DOMAIN = "@demo.example";
    private static final ZoneId ZONE = ZoneId.of("Asia/Jerusalem");

    private static final String[][] STUDENTS = {
            // first name, last name, education level, hourly rate, notes
            {"Dana", "Cohen", "11th grade", "160", "Preparing for the matriculation exam. Strong in algebra, needs practice with word problems."},
            {"Yuval", "Mizrahi", "9th grade", "140", "Quick learner, easily distracted. Short exercises work best."},
            {"Maya", "Levi", "10th grade", "150", "Working on essay writing and vocabulary."},
            {"Eitan", "Barak", "12th grade", "170", "Physics and math before the final exams."},
            {"Tamar", "Golan", "8th grade", "130", "Needs confidence more than content."},
            {"Noam", "Shapira", "Matriculation prep", "165", "Retaking one exam. Parents prefer weekly progress notes."}
    };

    /* which subjects each student studies (indexes into SUBJECT_NAMES) */
    private static final int[][] STUDENT_SUBJECTS = {{0}, {0}, {1}, {2, 0}, {1}, {0, 2}};
    private static final String[] SUBJECT_NAMES = {"Math", "English", "Physics"};

    /* what share of the lessons already given each student has paid for (0 = owes everything) */
    private static final double[] PAID_SHARE = {1.0, 1.0, 0.6, 0.5, 0.0, 0.85};

    private static final String[] LESSON_NOTES = {
            "Covered the new chapter, homework: exercises 4-6.",
            "Good progress. Repeat the last exercise before next time.",
            "Reviewed mistakes from the quiz.",
            "Started preparing for the upcoming test.",
            "Focused on word problems and checking answers."
    };

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;
    private final PaymentRepository paymentRepository;
    private final MaterialRepository materialRepository;
    private final ScheduleRuleRepository scheduleRuleRepository;
    private final ScheduleOverrideRepository scheduleOverrideRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoMode demoMode;
    private final TransactionTemplate transactionTemplate;

    /* on startup: if demo mode is on and there are no students at all, fill the empty database */
    @Override
    public void run(String... args) {
        if (!demoMode.isEnabled()) {
            return;
        }
        transactionTemplate.executeWithoutResult(status -> {
            if (studentRepository.count() == 0) {
                seed();
                log.info("Demo mode: seeded sample data");
            }
        });
    }

    /* every few hours: wipe the demo data and recreate it (DEMO_RESET_HOURS, default 6) */
    @Scheduled(initialDelayString = "PT${demo.reset-hours:6}H", fixedDelayString = "PT${demo.reset-hours:6}H")
    public void resetDemoData() {
        if (!demoMode.isEnabled()) {
            return;
        }
        try {
            transactionTemplate.executeWithoutResult(status -> {
                List<Student> students = studentRepository.findAll();
                boolean allDemo = students.stream()
                        .allMatch(s -> s.getUser().getEmail().toLowerCase().endsWith(DEMO_EMAIL_DOMAIN));
                if (!allDemo) {
                    log.warn("Demo reset skipped: found a student that is not demo data, nothing was deleted");
                    return;
                }
                wipe(students);
                seed();
                log.info("Demo mode: sample data was reset");
            });
        } catch (RuntimeException e) {
            log.error("Demo reset failed", e);
        }
    }

    /* deletes demo data children-first (foreign keys), never the teacher account.
       also removes the weekly availability, since the demo seeds its own */
    private void wipe(List<Student> students) {
        List<User> studentUsers = students.stream().map(Student::getUser).toList();
        materialRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        lessonRepository.deleteAllInBatch();
        scheduleOverrideRepository.deleteAllInBatch();
        scheduleRuleRepository.deleteAllInBatch();
        studentRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch(studentUsers);
    }

    /* creates everything: subjects, students, availability, lessons, payments, materials.
       dates are relative to today, so the schedule and statistics never look stale */
    private void seed() {
        Random random = new Random(2026);
        LocalDate today = LocalDate.now(ZONE);
        LocalTime now = LocalTime.now(ZONE);

        List<Subject> subjects = new ArrayList<>();
        for (String name : SUBJECT_NAMES) {
            subjects.add(subjectRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> subjectRepository.save(Subject.builder().name(name).build())));
        }

        /* one shared random password hash: nobody is meant to log in as a demo student */
        String passwordHash = passwordEncoder.encode(UUID.randomUUID().toString());
        List<Student> students = new ArrayList<>();
        for (String[] data : STUDENTS) {
            User user = userRepository.save(User.builder()
                    .email((data[0] + "." + data[1]).toLowerCase() + DEMO_EMAIL_DOMAIN)
                    .password(passwordHash)
                    .role(Role.STUDENT)
                    .firstName(data[0])
                    .lastName(data[1])
                    .build());
            students.add(studentRepository.save(Student.builder()
                    .user(user)
                    .hourlyRate(new BigDecimal(data[3]))
                    .educationLevel(data[2])
                    .notes(data[4])
                    .build()));
        }

        /* weekly availability: Sunday-Thursday 15:00-20:00, plus Monday and Wednesday mornings.
           only created when there is none, so a real teacher's own schedule is not duplicated */
        if (scheduleRuleRepository.count() == 0) {
            for (DayOfWeek day : List.of(DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
                    DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY)) {
                scheduleRuleRepository.save(ScheduleRule.builder()
                        .dayOfWeek(day).startTime(LocalTime.of(15, 0)).endTime(LocalTime.of(20, 0)).build());
            }
            for (DayOfWeek day : List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY)) {
                scheduleRuleRepository.save(ScheduleRule.builder()
                        .dayOfWeek(day).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(12, 0)).build());
            }
        }

        /* one blocked afternoon next week and one extra Friday morning, to show overrides on the grid */
        LocalDate blockedDate = nextWorkingDay(today.plusDays(8));
        scheduleOverrideRepository.save(ScheduleOverride.builder()
                .date(blockedDate).startTime(LocalTime.of(15, 0)).endTime(LocalTime.of(17, 0))
                .type(OverrideType.BLOCK).note("Personal appointment").build());
        LocalDate extraFriday = today.plusDays(1);
        while (extraFriday.getDayOfWeek() != DayOfWeek.FRIDAY) {
            extraFriday = extraFriday.plusDays(1);
        }
        scheduleOverrideRepository.save(ScheduleOverride.builder()
                .date(extraFriday).startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(12, 0))
                .type(OverrideType.ADD).note("Extra hours before exams").build());

        /* lessons: roughly 8 weeks back and 2 weeks ahead, one lesson per hour slot at most (no overlaps) */
        List<Lesson> allLessons = new ArrayList<>();
        for (int offset = -56; offset <= 14; offset++) {
            LocalDate date = today.plusDays(offset);
            DayOfWeek day = date.getDayOfWeek();
            if (day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY) {
                continue;
            }
            List<Integer> startHours = new ArrayList<>();
            if (day == DayOfWeek.MONDAY || day == DayOfWeek.WEDNESDAY) {
                startHours.addAll(List.of(9, 10, 11));
            }
            startHours.addAll(List.of(15, 16, 17, 18, 19));

            for (int hour : startHours) {
                if (random.nextDouble() >= 0.22) {
                    continue;
                }
                if (date.equals(blockedDate) && (hour == 15 || hour == 16)) {
                    continue; /* keep the blocked time free */
                }
                int studentIndex = random.nextInt(students.size());
                Student student = students.get(studentIndex);
                int[] studentSubjects = STUDENT_SUBJECTS[studentIndex];
                Subject subject = subjects.get(studentSubjects[random.nextInt(studentSubjects.length)]);

                LessonStatus status;
                if (date.isBefore(today)) {
                    status = random.nextDouble() < 0.9 ? LessonStatus.COMPLETED : LessonStatus.CANCELLED;
                } else if (date.equals(today)) {
                    status = LocalTime.of(hour, 0).plusHours(1).isBefore(now) ? LessonStatus.COMPLETED : LessonStatus.SCHEDULED;
                } else {
                    status = LessonStatus.SCHEDULED;
                }
                String notes = status == LessonStatus.COMPLETED && random.nextDouble() < 0.4
                        ? LESSON_NOTES[random.nextInt(LESSON_NOTES.length)] : null;

                allLessons.add(lessonRepository.save(Lesson.builder()
                        .student(student)
                        .date(date)
                        .startTime(LocalTime.of(hour, 0))
                        .endTime(LocalTime.of(hour + 1, 0))
                        .subject(subject)
                        .status(status)
                        .priceAtBooking(student.getHourlyRate())
                        .notes(notes)
                        .reminderSent(true)
                        .build()));
            }
        }

        seedPayments(students, allLessons, today);
        seedMaterials(students, allLessons);
    }

    /* payments: each student has paid for some share of the completed lessons, in 1-3 installments,
       so there is a mix of settled accounts and open debts. one payment is shown as cancelled */
    private void seedPayments(List<Student> students, List<Lesson> lessons, LocalDate today) {
        PaymentMethod[] methods = PaymentMethod.values();
        for (int i = 0; i < students.size(); i++) {
            Student student = students.get(i);
            double billed = lessons.stream()
                    .filter(l -> l.getStudent() == student && l.getStatus() == LessonStatus.COMPLETED)
                    .mapToDouble(l -> l.getPriceAtBooking().doubleValue())
                    .sum();
            long total = Math.round(billed * PAID_SHARE[i] / 10.0) * 10;
            if (total <= 0) {
                continue;
            }
            int installments = 1 + (i % 3);
            long part = Math.max(10, Math.round((double) total / installments / 10.0) * 10);
            long remaining = total;
            for (int k = 0; k < installments; k++) {
                long amount = (k == installments - 1) ? remaining : Math.min(part, remaining);
                if (amount <= 0) {
                    break;
                }
                remaining -= amount;
                paymentRepository.save(Payment.builder()
                        .student(student)
                        .amount(BigDecimal.valueOf(amount))
                        .paymentDate(today.minusDays(3 + (long) (installments - 1 - k) * 18))
                        .method(methods[(i + k) % methods.length])
                        .notes(k == 0 && i == 0 ? "Monthly payment" : null)
                        .build());
            }
        }
        paymentRepository.save(Payment.builder()
                .student(students.get(1))
                .amount(BigDecimal.valueOf(200))
                .paymentDate(today.minusDays(10))
                .method(PaymentMethod.BIT)
                .notes("Entered by mistake")
                .cancelled(true)
                .build());
    }

    /* materials: links and notes only, never files (files are blocked in demo mode) */
    private void seedMaterials(List<Student> students, List<Lesson> lessons) {
        saveMaterial(students.get(0), lastCompletedLesson(students.get(0), lessons), "Khan Academy: algebra practice",
                "Short videos and exercises for the topics we covered.", MaterialType.LINK, "https://www.khanacademy.org/math");
        saveMaterial(students.get(0), null, "Exam preparation checklist",
                "1. Review the formula sheet. 2. Redo the last three quizzes. 3. Time yourself on one full past exam.",
                MaterialType.NOTE, null);
        saveMaterial(students.get(2), lastCompletedLesson(students.get(2), lessons), "BBC Learning English",
                "Daily vocabulary and listening practice.", MaterialType.LINK, "https://www.bbc.co.uk/learningenglish");
        saveMaterial(students.get(2), null, "Essay structure",
                "Introduction with a clear thesis, two supporting paragraphs with examples, a short conclusion.",
                MaterialType.NOTE, null);
        saveMaterial(students.get(3), lastCompletedLesson(students.get(3), lessons), "PhET interactive simulations",
                "Try the forces and motion simulation before our next lesson.", MaterialType.LINK, "https://phet.colorado.edu/");
        saveMaterial(students.get(1), null, "Desmos graphing calculator",
                "Use it to check your answers when we work on functions.", MaterialType.LINK, "https://www.desmos.com/calculator");
    }

    private void saveMaterial(Student student, Lesson lesson, String title, String description,
                              MaterialType type, String url) {
        materialRepository.save(Material.builder()
                .student(student)
                .lesson(lesson)
                .title(title)
                .description(description)
                .type(type)
                .url(url)
                .build());
    }

    /* the student's most recent completed lesson, or null */
    private Lesson lastCompletedLesson(Student student, List<Lesson> lessons) {
        Lesson latest = null;
        for (Lesson lesson : lessons) {
            if (lesson.getStudent() == student && lesson.getStatus() == LessonStatus.COMPLETED
                    && (latest == null || lesson.getDate().isAfter(latest.getDate()))) {
                latest = lesson;
            }
        }
        return latest;
    }

    /* the first Sunday-Thursday date on or after the given one */
    private LocalDate nextWorkingDay(LocalDate date) {
        while (date.getDayOfWeek() == DayOfWeek.FRIDAY || date.getDayOfWeek() == DayOfWeek.SATURDAY) {
            date = date.plusDays(1);
        }
        return date;
    }
}
