package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

/* Spring Data JPA repository for password reset tokens. */

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /* looks a token up by the hash of what the user sent (the raw token is never stored) */
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /* the newest token of a user, if any - lets the service see when the last link was sent */
    Optional<PasswordResetToken> findFirstByUserIdOrderByIdDesc(Long userId);

    /* removes every token of a user - used so a new request replaces the old links,
       and after a successful reset so no other link keeps working */
    void deleteByUserId(Long userId);

    /* housekeeping: drops tokens that already expired */
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
}
