package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidRequestDataException;
import com.tutor.tutormanagementsystem.model.PasswordResetToken;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.PasswordResetTokenRepository;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import com.tutor.tutormanagementsystem.security.LoginRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/* the "forgot password" flow for people who are logged out:
   1. requestReset - the user gives an email, we mail them a one-time link
   2. resetPassword - the user opens the link and chooses a new password
   only a hash of the token is stored, a token works once, and it expires after an hour. */

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    static final Duration TOKEN_LIFETIME = Duration.ofHours(1);

    /* minimum gap between two emails to the same person, so the form can't be used to spam someone */
    static final Duration REQUEST_COOLDOWN = Duration.ofMinutes(1);

    private static final int TOKEN_BYTES = 32;
    private static final String INVALID_LINK_MESSAGE = "This reset link is invalid or has expired";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailer mailer;
    private final LoginRateLimiter loginRateLimiter;

    /* starts a reset for this email. returns nothing and never throws for an unknown email -
       the caller always shows the same message, so nobody can use this to learn who is registered */
    @Transactional
    public void requestReset(String email) {
        LocalDateTime now = LocalDateTime.now();

        /* housekeeping: expired tokens are useless, drop them as we go */
        tokenRepository.deleteByExpiresAtBefore(now);

        String normalized = AccountValidation.normalizeEmail(email);
        if (normalized == null || normalized.isBlank()) {
            return;
        }

        Optional<User> found = userRepository.findByEmailIgnoreCase(normalized);
        if (found.isEmpty()) {
            return;
        }
        User user = found.get();

        /* a link was sent less than a minute ago - skip, the earlier email is still valid.
           a token was created at (expiresAt - lifetime), so "recent" means expiresAt is still
           later than now + lifetime - cooldown */
        Optional<PasswordResetToken> latest = tokenRepository.findFirstByUserIdOrderByIdDesc(user.getId());
        if (latest.isPresent()
                && latest.get().getExpiresAt().isAfter(now.plus(TOKEN_LIFETIME).minus(REQUEST_COOLDOWN))) {
            return;
        }

        /* a new request replaces any older link */
        tokenRepository.deleteByUserId(user.getId());

        String token = newToken();
        tokenRepository.save(PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(hash(token))
                .expiresAt(now.plus(TOKEN_LIFETIME))
                .build());

        mailer.sendResetLink(user.getEmail(), token);
    }

    /* sets a new password if the token is real, unused and not expired.
       a bad password is rejected before the token is touched, so a typo doesn't burn the link */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new InvalidRequestDataException(INVALID_LINK_MESSAGE);
        }
        AccountValidation.requireValidPassword(newPassword);

        PasswordResetToken stored = tokenRepository.findByTokenHash(hash(token))
                .orElseThrow(() -> new InvalidRequestDataException(INVALID_LINK_MESSAGE));

        if (stored.getUsedAt() != null || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidRequestDataException(INVALID_LINK_MESSAGE);
        }

        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new InvalidRequestDataException(INVALID_LINK_MESSAGE));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        stored.setUsedAt(LocalDateTime.now());
        tokenRepository.save(stored);

        /* someone who was locked out by failed logins can now get in with the new password */
        loginRateLimiter.recordSuccessfulLogin(user.getEmail());
    }

    /* 32 random bytes, URL-safe so it can sit in a link as-is */
    private static String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /* SHA-256 as hex. a fast hash is fine here: the token is 256 random bits, not a guessable password */
    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
