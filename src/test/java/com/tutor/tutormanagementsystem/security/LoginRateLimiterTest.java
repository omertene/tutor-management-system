package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.exception.TooManyAttemptsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

/* plain unit test - no Spring, no mocks. the limiter keeps its state in memory,
   so every test creates a fresh instance and calls the real methods.
   the lockout window (1 minute) is not tested, because that would need waiting
   or a way to move the clock, and we don't change the production code for that. */

class LoginRateLimiterTest {

    private static final String EMAIL = "teacher@example.com";

    private LoginRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new LoginRateLimiter();
    }

    private void failTimes(String email, int times) {
        for (int i = 0; i < times; i++) {
            limiter.recordFailedAttempt(email);
        }
    }

    @Test
    void fourFailedAttempts_doNotLockTheEmail() {
        assertThatCode(() -> failTimes(EMAIL, 4)).doesNotThrowAnyException();
        assertThatCode(() -> limiter.checkNotLocked(EMAIL)).doesNotThrowAnyException();
    }

    /* the fifth failure is the one that locks, and it throws right away */
    @Test
    void fifthFailedAttempt_locksTheEmail() {
        failTimes(EMAIL, 4);

        assertThatThrownBy(() -> limiter.recordFailedAttempt(EMAIL))
                .isInstanceOf(TooManyAttemptsException.class);
    }

    @Test
    void lockedEmail_isRejectedBeforeCheckingThePassword() {
        assertThatThrownBy(() -> failTimes(EMAIL, 5)).isInstanceOf(TooManyAttemptsException.class);

        assertThatThrownBy(() -> limiter.checkNotLocked(EMAIL))
                .isInstanceOf(TooManyAttemptsException.class)
                .hasMessageContaining("Try again in");
    }

    @Test
    void lockout_ignoresLetterCase() {
        assertThatThrownBy(() -> failTimes("Teacher@Example.com", 5))
                .isInstanceOf(TooManyAttemptsException.class);

        assertThatThrownBy(() -> limiter.checkNotLocked("teacher@example.COM"))
                .isInstanceOf(TooManyAttemptsException.class);
    }

    @Test
    void lockingOneEmail_doesNotAffectAnotherOne() {
        assertThatThrownBy(() -> failTimes(EMAIL, 5)).isInstanceOf(TooManyAttemptsException.class);

        assertThatCode(() -> limiter.checkNotLocked("student@example.com")).doesNotThrowAnyException();
    }

    @Test
    void successfulLogin_resetsTheFailureCount() {
        failTimes(EMAIL, 4);
        limiter.recordSuccessfulLogin(EMAIL);

        /* four more failures are fine, because the counter started again from zero */
        assertThatCode(() -> failTimes(EMAIL, 4)).doesNotThrowAnyException();
        assertThatCode(() -> limiter.checkNotLocked(EMAIL)).doesNotThrowAnyException();
    }

    /* 20 failures at the same moment from 20 threads. if two threads could read the same count
       and both write count + 1, an increment would be lost and fewer than 16 would be rejected.
       failures number 5 to 20 each get rejected, so exactly 16 exceptions are expected. */
    @Test
    void concurrentFailures_doNotLoseIncrements() throws Exception {
        int threads = 20;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    go.await();
                    limiter.recordFailedAttempt(EMAIL);
                } catch (TooManyAttemptsException e) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }

        ready.await();
        go.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(10, TimeUnit.SECONDS)).isTrue();

        assertThat(rejected.get()).isEqualTo(16);
    }
}
