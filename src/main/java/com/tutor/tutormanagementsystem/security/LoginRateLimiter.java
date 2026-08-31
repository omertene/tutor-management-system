package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.exception.TooManyAttemptsException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ConcurrentHashMap;

/* brute-force protection for login - tracks failed attempts per email in
   memory and locks an email out for a bit once it hits MAX_ATTEMPTS in a row.
   per-instance only, wouldn't share lockouts across multiple app instances. */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 1;

    /* how long an entry stays useful before it's safe to drop */
    private static final long ENTRY_TTL_MINUTES = LOCKOUT_MINUTES;

    /* cap on tracked emails, so someone hammering with fresh addresses can't
       grow this map forever */
    private static final int MAX_TRACKED_EMAILS = 10_000;

    private record AttemptRecord(int failedAttempts, Instant lockedUntil, Instant lastAttempt) {
    }

    /* ConcurrentHashMap + compute() (below) so two failed logins for the same
       email at the same time can't both read the same count and lose an increment */
    private final ConcurrentHashMap<String, AttemptRecord> attemptsByEmail = new ConcurrentHashMap<>();

    /* call before checking the password - throws if this email is locked out */
    public void checkNotLocked(String email) {
        String key = email.toLowerCase();
        AttemptRecord record = attemptsByEmail.get(key);

        if (record == null || record.lockedUntil() == null) {
            return;
        }

        if (Instant.now().isBefore(record.lockedUntil())) {
            long millisLeft = Instant.now().until(record.lockedUntil(), ChronoUnit.MILLIS);
            long secondsLeft = (millisLeft + 999) / 1000;
            throw new TooManyAttemptsException(
                    "Too many failed login attempts. Try again in " + secondsLeft + " seconds.");
        }

        /* lockout expired - clear it, fresh set of attempts */
        attemptsByEmail.remove(key);
    }

    /* call after a failed password check, locks the email out at MAX_ATTEMPTS */
    public void recordFailedAttempt(String email) {
        String key = email.toLowerCase();

        /* compute() is atomic per key, so concurrent failures for the same
           email always increment from the latest value instead of racing */
        AttemptRecord updated = attemptsByEmail.compute(key, (ignoredKey, existing) -> {
            int failedAttempts = (existing == null ? 0 : existing.failedAttempts()) + 1;

            Instant lockedUntil = failedAttempts >= MAX_ATTEMPTS
                    ? Instant.now().plusSeconds(LOCKOUT_MINUTES * 60)
                    : null;

            return new AttemptRecord(failedAttempts, lockedUntil, Instant.now());
        });

        pruneIfOversized();

        if (updated.lockedUntil() != null) {
            long millisLeft = Instant.now().until(updated.lockedUntil(), ChronoUnit.MILLIS);
            long secondsLeft = (millisLeft + 999) / 1000;
            throw new TooManyAttemptsException(
                    "Too many failed login attempts. Try again in " + secondsLeft + " seconds.");
        }
    }

    /* call after a successful login, clears any failure history for this email */
    public void recordSuccessfulLogin(String email) {
        attemptsByEmail.remove(email.toLowerCase());
    }

    /* keeps the map bounded once it grows past the cap: first drop old,
       non-locked entries; if that's not enough, drop every non-locked entry
       regardless of age. active lockouts are never evicted. */
    private void pruneIfOversized() {
        if (attemptsByEmail.size() <= MAX_TRACKED_EMAILS) {
            return;
        }

        Instant cutoff = Instant.now().minusSeconds(ENTRY_TTL_MINUTES * 60);
        attemptsByEmail.entrySet().removeIf(entry ->
                !isLockedNow(entry.getValue()) && entry.getValue().lastAttempt().isBefore(cutoff));

        if (attemptsByEmail.size() <= MAX_TRACKED_EMAILS) {
            return;
        }

        attemptsByEmail.entrySet().removeIf(entry -> !isLockedNow(entry.getValue()));
    }

    /* true if this record's lockout is still in effect right now */
    private boolean isLockedNow(AttemptRecord record) {
        return record.lockedUntil() != null && Instant.now().isBefore(record.lockedUntil());
    }
}
