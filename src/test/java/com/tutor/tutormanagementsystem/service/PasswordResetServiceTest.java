package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.exception.InvalidRequestDataException;
import com.tutor.tutormanagementsystem.exception.InvalidStudentDataException;
import com.tutor.tutormanagementsystem.model.PasswordResetToken;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.PasswordResetTokenRepository;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import com.tutor.tutormanagementsystem.security.LoginRateLimiter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/* unit test of the "forgot password" flow. the repositories, encoder, mailer and rate limiter are
   fakes, so the test checks only the decisions inside PasswordResetService: who gets an email,
   what is stored (a hash, never the token), and when a token may be used. */

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    private static final String EMAIL = "dana@example.com";
    private static final Long USER_ID = 5L;
    private static final String RAW_TOKEN = "raw-token-from-the-email-link";
    private static final String STRONG_PASSWORD = "NewPass123";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PasswordResetMailer mailer;

    @Mock
    private LoginRateLimiter loginRateLimiter;

    @InjectMocks
    private PasswordResetService service;

    private User user() {
        return User.builder().id(USER_ID).email(EMAIL).password("old-hash").role(Role.STUDENT).build();
    }

    /* a stored token for RAW_TOKEN, valid for another 30 minutes unless the test changes it */
    private PasswordResetToken storedToken() {
        return PasswordResetToken.builder()
                .id(1L)
                .userId(USER_ID)
                .tokenHash(PasswordResetService.hash(RAW_TOKEN))
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();
    }

    /* a token that was created `ago` ago (a token is created at expiresAt minus its lifetime) */
    private PasswordResetToken tokenCreated(java.time.Duration ago) {
        return PasswordResetToken.builder()
                .id(1L)
                .userId(USER_ID)
                .tokenHash("older-hash")
                .expiresAt(LocalDateTime.now().plus(PasswordResetService.TOKEN_LIFETIME).minus(ago))
                .build();
    }

    // ---------- requestReset ----------

    @Test
    void unknownEmail_sendsNothingAndStoresNothing() {
        when(userRepository.findByEmailIgnoreCase("nobody@example.com")).thenReturn(Optional.empty());

        service.requestReset("nobody@example.com");

        verifyNoInteractions(mailer);
        verify(tokenRepository, never()).save(any());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void missingEmail_isIgnoredWithoutLookingAnyoneUp(String email) {
        service.requestReset(email);

        verifyNoInteractions(userRepository, mailer);
    }

    @Test
    void knownEmail_storesOnlyTheHashAndMailsTheRawToken() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user()));
        when(tokenRepository.findFirstByUserIdOrderByIdDesc(USER_ID)).thenReturn(Optional.empty());

        /* mixed case and spaces: the email must be normalized before the lookup */
        service.requestReset("  Dana@Example.COM ");

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(saved.capture());
        ArgumentCaptor<String> mailedToken = ArgumentCaptor.forClass(String.class);
        verify(mailer).sendResetLink(eq(EMAIL), mailedToken.capture());

        assertThat(saved.getValue().getUserId()).isEqualTo(USER_ID);
        assertThat(saved.getValue().getUsedAt()).isNull();
        assertThat(mailedToken.getValue()).isNotBlank();
        /* the database never sees the raw token, only its hash */
        assertThat(saved.getValue().getTokenHash())
                .isNotEqualTo(mailedToken.getValue())
                .isEqualTo(PasswordResetService.hash(mailedToken.getValue()));
        /* valid for about an hour */
        LocalDateTime expiresAt = saved.getValue().getExpiresAt();
        assertThat(expiresAt).isAfter(LocalDateTime.now().plusMinutes(59));
        assertThat(expiresAt).isBefore(LocalDateTime.now().plusMinutes(61));
    }

    @Test
    void newRequest_replacesAnyOlderLinksOfThatUser() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user()));
        when(tokenRepository.findFirstByUserIdOrderByIdDesc(USER_ID)).thenReturn(Optional.empty());

        service.requestReset(EMAIL);

        verify(tokenRepository).deleteByUserId(USER_ID);
    }

    @Test
    void secondRequestWithinTheCooldown_isIgnored() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user()));
        when(tokenRepository.findFirstByUserIdOrderByIdDesc(USER_ID))
                .thenReturn(Optional.of(tokenCreated(java.time.Duration.ofSeconds(10))));

        service.requestReset(EMAIL);

        verifyNoInteractions(mailer);
        verify(tokenRepository, never()).save(any());
        verify(tokenRepository, never()).deleteByUserId(any());
    }

    @Test
    void requestAfterTheCooldown_sendsANewLink() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user()));
        when(tokenRepository.findFirstByUserIdOrderByIdDesc(USER_ID))
                .thenReturn(Optional.of(tokenCreated(java.time.Duration.ofMinutes(2))));

        service.requestReset(EMAIL);

        verify(tokenRepository).save(any(PasswordResetToken.class));
        verify(mailer).sendResetLink(eq(EMAIL), any());
    }

    // ---------- resetPassword ----------

    @Test
    void validToken_setsTheNewPasswordAndMarksTheTokenUsed() {
        User user = user();
        PasswordResetToken token = storedToken();
        when(tokenRepository.findByTokenHash(PasswordResetService.hash(RAW_TOKEN))).thenReturn(Optional.of(token));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(STRONG_PASSWORD)).thenReturn("new-hash");

        service.resetPassword(RAW_TOKEN, STRONG_PASSWORD);

        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(token.getUsedAt()).isNotNull();
        verify(userRepository).save(user);
        verify(tokenRepository).save(token);
        /* a person locked out by failed logins can get in with the new password */
        verify(loginRateLimiter).recordSuccessfulLogin(EMAIL);
    }

    @Test
    void unknownToken_isRejectedAndNothingChanges() {
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("made-up"))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetPassword("made-up", STRONG_PASSWORD))
                .isInstanceOf(InvalidRequestDataException.class);

        verifyNoInteractions(passwordEncoder, loginRateLimiter);
        verify(userRepository, never()).save(any());
    }

    @Test
    void expiredToken_isRejectedAndNothingChanges() {
        PasswordResetToken expired = storedToken();
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash(RAW_TOKEN))).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.resetPassword(RAW_TOKEN, STRONG_PASSWORD))
                .isInstanceOf(InvalidRequestDataException.class);

        verifyNoInteractions(passwordEncoder, loginRateLimiter);
        verify(userRepository, never()).save(any());
    }

    @Test
    void alreadyUsedToken_isRejected() {
        PasswordResetToken used = storedToken();
        used.setUsedAt(LocalDateTime.now().minusMinutes(5));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash(RAW_TOKEN))).thenReturn(Optional.of(used));

        assertThatThrownBy(() -> service.resetPassword(RAW_TOKEN, STRONG_PASSWORD))
                .isInstanceOf(InvalidRequestDataException.class);

        verifyNoInteractions(passwordEncoder, loginRateLimiter);
        verify(userRepository, never()).save(any());
    }

    @Test
    void tokenOfAUserThatNoLongerExists_isRejected() {
        when(tokenRepository.findByTokenHash(PasswordResetService.hash(RAW_TOKEN)))
                .thenReturn(Optional.of(storedToken()));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetPassword(RAW_TOKEN, STRONG_PASSWORD))
                .isInstanceOf(InvalidRequestDataException.class);

        verifyNoInteractions(passwordEncoder);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void missingToken_isRejectedWithoutTouchingTheDatabase(String token) {
        assertThatThrownBy(() -> service.resetPassword(token, STRONG_PASSWORD))
                .isInstanceOf(InvalidRequestDataException.class);

        verifyNoInteractions(tokenRepository, userRepository);
    }

    @Test
    void weakPassword_isRejectedBeforeTheTokenIsLookedUp() {
        /* a typo must not burn the link: the token is not even read */
        assertThatThrownBy(() -> service.resetPassword(RAW_TOKEN, "short"))
                .isInstanceOf(InvalidStudentDataException.class);

        verifyNoInteractions(tokenRepository, userRepository, passwordEncoder);
    }

    // ---------- hash ----------

    @Test
    void hash_isTheKnownSha256HexOfTheInput() {
        assertThat(PasswordResetService.hash("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
