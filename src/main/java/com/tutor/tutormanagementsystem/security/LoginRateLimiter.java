package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.exception.TooManyAttemptsException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ConcurrentHashMap;


@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 1;

    private record AttemptRecord(int failedAttempts, Instant lockedUntil) {
    }

    private final ConcurrentHashMap<String, AttemptRecord> attemptsByEmail = new ConcurrentHashMap<>();


    public void checkNotLocked(String email) {
        String key = email.toLowerCase();
        AttemptRecord record = attemptsByEmail.get(key);

        if (record == null || record.lockedUntil() == null) {
            return;
        }

        if (Instant.now().isBefore(record.lockedUntil())) {
            long secondsLeft = Instant.now().until(record.lockedUntil(), ChronoUnit.SECONDS) + 1;
            throw new TooManyAttemptsException(
                    "Too many failed login attempts. Try again in " + secondsLeft + " seconds.");
        }

        // lockout has expired - clear it so this email gets a fresh set of attempts
        attemptsByEmail.remove(key);
    }

    // call after a failed password check - locks the email out once MAX_ATTEMPTS is reached.
    // throws immediately if this attempt is the one that triggers the lock, so the caller
    // returns the lockout message on the same request instead of one request later
    public void recordFailedAttempt(String email) {
        String key = email.toLowerCase();

        AttemptRecord updated = attemptsByEmail.compute(key, (ignoredKey, existing) -> {
            int failedAttempts = (existing == null ? 0 : existing.failedAttempts()) + 1;

            Instant lockedUntil = failedAttempts >= MAX_ATTEMPTS
                    ? Instant.now().plusSeconds(LOCKOUT_MINUTES * 60)
                    : null;

            return new AttemptRecord(failedAttempts, lockedUntil);
        });

        if (updated.lockedUntil() != null) {
            long secondsLeft = Instant.now().until(updated.lockedUntil(), ChronoUnit.SECONDS) + 1;
            throw new TooManyAttemptsException(
                    "Too many failed login attempts. Try again in " + secondsLeft + " seconds.");
        }
    }

   
    public void recordSuccessfulLogin(String email) {
        attemptsByEmail.remove(email.toLowerCase());
    }
}
