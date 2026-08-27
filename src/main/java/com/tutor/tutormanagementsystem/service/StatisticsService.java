package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.DashboardStatisticsRequest;
import com.tutor.tutormanagementsystem.dto.DashboardStatisticsResponse;
import com.tutor.tutormanagementsystem.dto.MonthlyAmount;
import com.tutor.tutormanagementsystem.dto.MonthlyTrend;
import com.tutor.tutormanagementsystem.dto.StudentPerformance;
import com.tutor.tutormanagementsystem.dto.SubjectPerformance;
import com.tutor.tutormanagementsystem.model.Lesson;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/* Service for aggregating financial and pedagogical metrics into a unified statistics dashboard */

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final PaymentService paymentService;
    private final LessonService lessonService;


    /* Returns all years that have at least one completed lesson to populate dashboard year filters */
    public List<Integer> getYearsWithData() {
        return lessonService.getYearsWithCompletedLessons();
    }


    /* Computes full dashboard statistics: financial KPIs, subject breakdowns, top students, and 12-month trends */
    public DashboardStatisticsResponse getDashboardStatistics(DashboardStatisticsRequest request) {
        List<Lesson> lessonsInRange = lessonService.getCompletedLessonsInRange(
                request.startDate(), request.endDate(), request.subjectId());

        /* Calculate total revenue billed from completed lessons */
        BigDecimal totalRevenue = lessonsInRange.stream()
                .map(Lesson::getPriceAtBooking)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        /* Sum total teaching hours */
        double totalHours = lessonsInRange.stream()
                .mapToDouble(lessonService::lessonHours)
                .sum();

        long totalLessons = lessonsInRange.size();

        /* Calculate effective hourly rate (revenue / hours) rounded to 2 decimal places */
        BigDecimal effectiveHourlyRate = totalHours > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalHours), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        /* Total payments received in the date range */
        BigDecimal incomeReceived = paymentService.getIncomeReceivedInRange(request.startDate(), request.endDate());

        List<SubjectPerformance> subjectBreakdown = buildSubjectBreakdown(lessonsInRange);
        List<StudentPerformance> topStudents = buildTopStudents(lessonsInRange);
        List<MonthlyTrend> monthlyTrend = buildMonthlyTrend(request.subjectId());

        return new DashboardStatisticsResponse(
                totalRevenue,
                incomeReceived,
                totalLessons,
                totalHours,
                effectiveHourlyRate,
                monthlyTrend,
                subjectBreakdown,
                topStudents
        );
    }


    /* Groups lessons by subject and calculates lessons count, total hours, revenue, and average hourly rate */
    private List<SubjectPerformance> buildSubjectBreakdown(List<Lesson> lessons) {
        Map<String, List<Lesson>> bySubject = lessons.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        lesson -> lesson.getSubject().getName(), LinkedHashMap::new, java.util.stream.Collectors.toList()));

        return bySubject.entrySet().stream()
                .map(entry -> {
                    List<Lesson> subjectLessons = entry.getValue();
                    BigDecimal revenue = subjectLessons.stream()
                            .map(Lesson::getPriceAtBooking)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    double hours = subjectLessons.stream().mapToDouble(lessonService::lessonHours).sum();
                    BigDecimal averageRate = hours > 0
                            ? revenue.divide(BigDecimal.valueOf(hours), 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    return new SubjectPerformance(entry.getKey(), subjectLessons.size(), hours, revenue, averageRate);
                })
                .sorted(Comparator.comparing(SubjectPerformance::totalRevenue).reversed())
                .toList();
    }


    /* Groups lessons by student and aggregates total completed lessons and billed amount */
    private List<StudentPerformance> buildTopStudents(List<Lesson> lessons) {
        Map<Long, List<Lesson>> byStudent = lessons.stream()
                .collect(java.util.stream.Collectors.groupingBy(lesson -> lesson.getStudent().getId()));

        return byStudent.values().stream()
                .map(studentLessons -> {
                    Lesson first = studentLessons.get(0);
                    BigDecimal billed = studentLessons.stream()
                            .map(Lesson::getPriceAtBooking)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new StudentPerformance(
                            first.getStudent().getId(),
                            first.getStudent().getUser().getFirstName(),
                            first.getStudent().getUser().getLastName(),
                            studentLessons.size(),
                            billed
                    );
                })
                .sorted(Comparator.comparing(StudentPerformance::totalBilled).reversed())
                .toList();
    }


    /* Constructs a 12-month trend of billed revenue, collected income, and teaching hours */
    private List<MonthlyTrend> buildMonthlyTrend(Long subjectId) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusMonths(11).withDayOfMonth(1);
        LocalDate end = today.withDayOfMonth(today.lengthOfMonth());

        List<Lesson> lessons = lessonService.getCompletedLessonsInRange(start, end, subjectId);

        Map<String, BigDecimal> revenueByMonth = new LinkedHashMap<>();
        Map<String, Double> hoursByMonth = new LinkedHashMap<>();

        /* Initialize each month with 0 to ensure continuous chart rendering on the client */
        for (int i = 0; i < 12; i++) {
            LocalDate month = start.plusMonths(i);
            String key = month.getYear() + "-" + month.getMonthValue();
            revenueByMonth.put(key, BigDecimal.ZERO);
            hoursByMonth.put(key, 0.0);
        }

        /* Accumulate lesson earnings and total teaching duration by month */
        for (Lesson lesson : lessons) {
            String key = lesson.getDate().getYear() + "-" + lesson.getDate().getMonthValue();
            revenueByMonth.merge(key, lesson.getPriceAtBooking(), BigDecimal::add);
            hoursByMonth.merge(key, lessonService.lessonHours(lesson), Double::sum);
        }

        Map<String, BigDecimal> incomeByMonth = new LinkedHashMap<>();
        for (int i = 0; i < 12; i++) {
            LocalDate month = start.plusMonths(i);
            incomeByMonth.put(month.getYear() + "-" + month.getMonthValue(), BigDecimal.ZERO);
        }

        /* Merge actual cash receipts from payments across the full student balance */
        for (MonthlyAmount row : paymentService.getIncomeByMonthInRange(start, end)) {
            incomeByMonth.merge(row.year() + "-" + row.month(), row.total(), (a, b) -> b);
        }

        /* Transform monthly mappings into ordered DTO data points */
        return revenueByMonth.keySet().stream()
                .map(key -> {
                    String[] parts = key.split("-");
                    int year = Integer.parseInt(parts[0]);
                    int month = Integer.parseInt(parts[1]);
                    return new MonthlyTrend(
                            year, month,
                            revenueByMonth.get(key),
                            incomeByMonth.getOrDefault(key, BigDecimal.ZERO),
                            hoursByMonth.get(key));
                })
                .toList();
    }
}
