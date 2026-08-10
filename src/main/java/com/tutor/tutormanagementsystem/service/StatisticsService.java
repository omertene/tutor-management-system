package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.StatisticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

// aggregates numbers already computed by PaymentService/LessonService into one
// dashboard response. deliberately has no repository of its own and never injects
// PaymentRepository/LessonRepository directly - it only asks the two domain services
// for pre-summarized data, same "go through the owning service" rule used everywhere
// else in this app (see MaterialService/PaymentService for the same pattern)
@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final PaymentService paymentService;
    private final LessonService lessonService;

    public StatisticsResponse getStatistics() {
        return new StatisticsResponse(
                paymentService.getTotalIncome(),
                paymentService.getIncomeByMonth(),
                lessonService.getTotalCompletedLessons(),
                lessonService.getCompletedLessonsByMonth(),
                lessonService.getCompletedLessonsBySubject(),
                paymentService.getAllDebts()
        );
    }
}
