package com.tutor.tutormanagementsystem.jms;


public final class JmsQueues {

    // messages here are lesson IDs that need a "your lesson is coming up" reminder
    public static final String LESSON_REMINDER_QUEUE = "lesson-reminder-queue";

    private JmsQueues() {
    }
}
