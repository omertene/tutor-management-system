package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.DashboardStatisticsRequest;
import com.tutor.tutormanagementsystem.dto.DashboardStatisticsResponse;
import com.tutor.tutormanagementsystem.dto.MonthlyAmount;
import com.tutor.tutormanagementsystem.dto.MonthlyTrend;
import com.tutor.tutormanagementsystem.model.Lesson;
import com.tutor.tutormanagementsystem.model.LessonStatus;
import com.tutor.tutormanagementsystem.model.Student;
import com.tutor.tutormanagementsystem.model.Subject;
import com.tutor.tutormanagementsystem.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/* unit test of the dashboard maths: totals, effective hourly rate, grouping by subject and by student,
   sorting, and the 12-month trend. LessonService and PaymentService are Mockito fakes that hand the
   service ready-made lessons, so every expected number below can be checked by hand. */

@ExtendWith(MockitoExtension.class)
class StatisticsServiceTest {

    /* the date range the user chose on the dashboard - far from "now", so it never mixes with the trend range */
    private static final LocalDate RANGE_START = LocalDate.of(2000, 1, 1);
    private static final LocalDate RANGE_END = LocalDate.of(2000, 12, 31);

    /* the 12-month trend always ends this month - the same dates the service computes */
    private static final LocalDate TODAY = LocalDate.now();
    private static final LocalDate TREND_START = TODAY.minusMonths(11).withDayOfMonth(1);
    private static final LocalDate TREND_END = TODAY.withDayOfMonth(TODAY.lengthOfMonth());

    @Mock
    private PaymentService paymentService;

    @Mock
    private LessonService lessonService;

    @InjectMocks
    private StatisticsService service;

    private Student student(long id, String firstName) {
        User user = User.builder().firstName(firstName).lastName("Cohen").build();
        return Student.builder().id(id).user(user).hourlyRate(new BigDecimal("100")).build();
    }

    private Lesson lesson(Student student, String subjectName, LocalDate date, int minutes, String price) {
        return Lesson.builder()
                .student(student)
                .subject(Subject.builder().id(1L).name(subjectName).build())
                .date(date)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 0).plusMinutes(minutes))
                .status(LessonStatus.COMPLETED)
                .priceAtBooking(new BigDecimal(price))
                .build();
    }

    /* the fake LessonService has no real lessonHours(), so it is computed from the lesson's own times */
    private void givenHoursComputedFromTheLessonTimes() {
        lenient().when(lessonService.lessonHours(any(Lesson.class))).thenAnswer(invocation -> {
            Lesson lesson = invocation.getArgument(0);
            return Duration.between(lesson.getStartTime(), lesson.getEndTime()).toMinutes() / 60.0;
        });
    }

    /* the service asks LessonService twice: once for the chosen range, once for the 12-month trend */
    private void givenLessons(Long subjectId, List<Lesson> inRange, List<Lesson> inTrend) {
        when(lessonService.getCompletedLessonsInRange(RANGE_START, RANGE_END, subjectId)).thenReturn(inRange);
        when(lessonService.getCompletedLessonsInRange(TREND_START, TREND_END, subjectId)).thenReturn(inTrend);
        when(paymentService.getIncomeReceivedInRange(RANGE_START, RANGE_END)).thenReturn(new BigDecimal("200"));
    }

    private DashboardStatisticsResponse stats(Long subjectId) {
        return service.getDashboardStatistics(new DashboardStatisticsRequest(RANGE_START, RANGE_END, subjectId));
    }

    @Test
    void noLessons_giveZeroTotalsAndNoDivisionByZero() {
        givenLessons(null, List.of(), List.of());

        DashboardStatisticsResponse response = stats(null);

        assertThat(response.totalLessons()).isZero();
        assertThat(response.totalHours()).isZero();
        assertThat(response.totalRevenue()).isEqualByComparingTo("0");
        assertThat(response.effectiveHourlyRate()).isEqualByComparingTo("0");
        assertThat(response.subjectBreakdown()).isEmpty();
        assertThat(response.topStudents()).isEmpty();
    }

    @Test
    void totals_sumRevenueHoursAndLessons_andEffectiveRateIsRevenuePerHour() {
        Student dana = student(1, "Dana");
        givenHoursComputedFromTheLessonTimes();
        givenLessons(null, List.of(
                lesson(dana, "Math", RANGE_START, 60, "100"),
                lesson(dana, "Math", RANGE_START.plusDays(1), 90, "150")), List.of());

        DashboardStatisticsResponse response = stats(null);

        assertThat(response.totalLessons()).isEqualTo(2);
        assertThat(response.totalRevenue()).isEqualByComparingTo("250");
        assertThat(response.totalHours()).isEqualTo(2.5);
        assertThat(response.effectiveHourlyRate()).isEqualByComparingTo("100.00");
        assertThat(response.incomeReceived()).isEqualByComparingTo("200");
    }

    @Test
    void subjectBreakdown_groupsBySubject_andListsTheBiggestRevenueFirst() {
        Student dana = student(1, "Dana");
        givenHoursComputedFromTheLessonTimes();
        givenLessons(null, List.of(
                lesson(dana, "Math", RANGE_START, 60, "100"),
                lesson(dana, "English", RANGE_START.plusDays(1), 60, "300"),
                lesson(dana, "Math", RANGE_START.plusDays(2), 60, "100")), List.of());

        var breakdown = stats(null).subjectBreakdown();

        assertThat(breakdown).hasSize(2);
        assertThat(breakdown.get(0).subjectName()).isEqualTo("English");
        assertThat(breakdown.get(0).totalRevenue()).isEqualByComparingTo("300");
        assertThat(breakdown.get(1).subjectName()).isEqualTo("Math");
        assertThat(breakdown.get(1).lessonCount()).isEqualTo(2);
        assertThat(breakdown.get(1).totalHours()).isEqualTo(2.0);
        assertThat(breakdown.get(1).totalRevenue()).isEqualByComparingTo("200");
        assertThat(breakdown.get(1).averageRatePerHour()).isEqualByComparingTo("100.00");
    }

    @Test
    void topStudents_aggregatePerStudent_andListsTheBiggestBilledFirst() {
        Student dana = student(1, "Dana");
        Student yossi = student(2, "Yossi");
        givenHoursComputedFromTheLessonTimes();
        givenLessons(null, List.of(
                lesson(dana, "Math", RANGE_START, 60, "100"),
                lesson(yossi, "Math", RANGE_START.plusDays(1), 60, "120"),
                lesson(dana, "Math", RANGE_START.plusDays(2), 60, "100"),
                lesson(dana, "Math", RANGE_START.plusDays(3), 60, "100")), List.of());

        var top = stats(null).topStudents();

        assertThat(top).hasSize(2);
        assertThat(top.get(0).firstName()).isEqualTo("Dana");
        assertThat(top.get(0).lessonCount()).isEqualTo(3);
        assertThat(top.get(0).totalBilled()).isEqualByComparingTo("300");
        assertThat(top.get(1).firstName()).isEqualTo("Yossi");
        assertThat(top.get(1).totalBilled()).isEqualByComparingTo("120");
    }

    @Test
    void subjectFilter_isPassedOnToTheLessonQueries() {
        givenLessons(7L, List.of(), List.of());

        stats(7L);

        verify(lessonService).getCompletedLessonsInRange(RANGE_START, RANGE_END, 7L);
        verify(lessonService).getCompletedLessonsInRange(TREND_START, TREND_END, 7L);
    }

    /* ---------- the 12-month trend ---------- */

    @Test
    void trend_hasTwelveContinuousMonths_endingThisMonth_evenWithNoData() {
        givenLessons(null, List.of(), List.of());

        List<MonthlyTrend> trend = stats(null).monthlyTrend();

        assertThat(trend).hasSize(12);
        assertThat(trend.get(0).year()).isEqualTo(TREND_START.getYear());
        assertThat(trend.get(0).month()).isEqualTo(TREND_START.getMonthValue());
        assertThat(trend.get(11).year()).isEqualTo(TODAY.getYear());
        assertThat(trend.get(11).month()).isEqualTo(TODAY.getMonthValue());
        assertThat(trend).allSatisfy(month -> {
            assertThat(month.revenue()).isEqualByComparingTo("0");
            assertThat(month.incomeReceived()).isEqualByComparingTo("0");
            assertThat(month.hours()).isZero();
        });
    }

    @Test
    void trend_putsLessonsAndPaymentsInTheirOwnMonth() {
        Student dana = student(1, "Dana");
        givenHoursComputedFromTheLessonTimes();
        givenLessons(null, List.of(), List.of(lesson(dana, "Math", TODAY, 120, "200")));
        when(paymentService.getIncomeByMonthInRange(TREND_START, TREND_END))
                .thenReturn(List.of(new MonthlyAmount(TODAY.getYear(), TODAY.getMonthValue(), new BigDecimal("500"))));

        List<MonthlyTrend> trend = stats(null).monthlyTrend();

        MonthlyTrend thisMonth = trend.get(11);
        assertThat(thisMonth.revenue()).isEqualByComparingTo("200");
        assertThat(thisMonth.hours()).isEqualTo(2.0);
        assertThat(thisMonth.incomeReceived()).isEqualByComparingTo("500");

        MonthlyTrend previousMonth = trend.get(10);
        assertThat(previousMonth.revenue()).isEqualByComparingTo("0");
        assertThat(previousMonth.incomeReceived()).isEqualByComparingTo("0");
    }

    @Test
    void yearsWithData_comesFromTheLessonService() {
        when(lessonService.getYearsWithCompletedLessons()).thenReturn(List.of(2026, 2025));

        assertThat(service.getYearsWithData()).containsExactly(2026, 2025);
    }
}
