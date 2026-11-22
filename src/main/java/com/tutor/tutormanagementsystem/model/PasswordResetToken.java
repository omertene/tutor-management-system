package com.tutor.tutormanagementsystem.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/* a one-time "forgot password" token. only the SHA-256 hash of the token is stored,
   never the token itself - the real token exists only in the email link, so a leaked
   database can't be used to reset anyone's password.
   a token is single-use (usedAt) and short-lived (expiresAt). */

@Entity
@Table(name = "password_reset_tokens",
        indexes = @Index(name = "idx_password_reset_token_hash", columnList = "tokenHash", unique = true))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(updatable = false, nullable = false)
    private Long id;

    // which user this token belongs to
    @Column(nullable = false)
    private Long userId;

    // SHA-256 of the token, hex encoded (64 chars)
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    // null until the token is used to set a new password
    private LocalDateTime usedAt;
}
