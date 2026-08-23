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

    // an entry is only useful until its lockout expires (or, for a partial streak,
    // until the user gets a fresh set of attempts anyway), so anything older than
    // this is dead weight and safe to drop
    private static final long ENTRY_TTL_MINUTES = LOCKOUT_MINUTES;

    // hard ceiling on how many emails we track at once. entries are normally removed
    // on a successful login or once a lockout expires, but a caller that just keeps
    // trying new addresses never triggers either path - without a cap the map grows
    // for as long as the app runs
    private static final int MAX_TRACKED_EMAILS = 10_000;

    // lastAttempt is what makes an entry expirable: lockedUntil is null for a partial
    // streak (1-4 failures), so it alone can't tell us when the entry stopped mattering
    private record AttemptRecord(int failedAttempts, Instant lockedUntil, Instant lastAttempt) {
    }

    private final ConcurrentHashMap<String, AttemptRecord> attemptsByEmail = new ConcurrentHashMap<>();


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

   
    public void recordSuccessfulLogin(String email) {
        attemptsByEmail.remove(email.toLowerCase());
    }

    // keeps the map bounded. runs only once it has grown past the cap, so a normal
    // login costs a single size() check.
    //
    // two passes, because the obvious one isn't enough on its own: dropping entries
    // older than the TTL does nothing against the case the cap exists for, which is
    // someone hammering the endpoint with a stream of *fresh* addresses - those
    // entries are all brand new, so none are expired yet and the map keeps growing.
    // so if the first pass doesn't get us under the cap, drop every entry that isn't
    // a live lockout, regardless of age. that only ever discards partial streaks
    // (1-4 failures), which costs an attacker nothing they couldn't get by waiting
    // out the TTL anyway. live lockouts are never evicted by either pass - letting a
    // flood clear those would turn this into a way to unlock yourself
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

    private boolean isLockedNow(AttemptRecord record) {
        return record.lockedUntil() != null && Instant.now().isBefore(record.lockedUntil());
    }
}
