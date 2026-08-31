package com.tutor.tutormanagementsystem.jms;

/* queue names in one place, so the producer and consumer can't drift apart with a typo */
public final class JmsQueues {

    /* messages here are lesson IDs that need a "your lesson is coming up" reminder */
    public static final String LESSON_REMINDER_QUEUE = "lesson-reminder-queue";

    /* just a bag of constants, never instantiated */
    private JmsQueues() {
    }
}
