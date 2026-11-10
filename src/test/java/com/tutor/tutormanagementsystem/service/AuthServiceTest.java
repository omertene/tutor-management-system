package com.tutor.tutormanagementsystem.service;

import com.tutor.tutormanagementsystem.dto.LoginRequest;
import com.tutor.tutormanagementsystem.dto.LoginResponse;
import com.tutor.tutormanagementsystem.exception.InvalidCredentialsException;
import com.tutor.tutormanagementsystem.exception.TooManyAttemptsException;
import com.tutor.tutormanagementsystem.model.Role;
import com.tutor.tutormanagementsystem.model.User;
import com.tutor.tutormanagementsystem.repository.UserRepository;
import com.tutor.tutormanagementsystem.security.JwtService;
import com.tutor.tutormanagementsystem.security.LoginRateLimiter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/* unit test of the login flow. the user repository, password encoder, token service and
   rate limiter are all fakes, so the test checks only the order of decisions inside login():
   validate input, check lockout, find user, check password, reset counter, issue token. */

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String EMAIL = "dana@example.com";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private LoginRateLimiter loginRateLimiter;

    @InjectMocks
    private AuthService service;

    private User user() {
        return User.builder().id(5L).email(EMAIL).password("hashed").role(Role.STUDENT).build();
    }

    @Test
    void blankEmail_isRejectedBeforeTouchingTheLimiterOrDatabase() {
        assertThatThrownBy(() -> service.login(new LoginRequest("  ", "pass")))
                .isInstanceOf(InvalidCredentialsException.class);

        verifyNoInteractions(loginRateLimiter, userRepository);
    }

    @Test
    void missingPassword_isRejected() {
        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, null)))
                .isInstanceOf(InvalidCredentialsException.class);

        verifyNoInteractions(loginRateLimiter, userRepository);
    }

    @Test
    void lockedEmail_isRejectedWithoutLookingUpTheUser() {
        doThrow(new TooManyAttemptsException("locked")).when(loginRateLimiter).checkNotLocked(EMAIL);

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "pass")))
                .isInstanceOf(TooManyAttemptsException.class);

        verifyNoInteractions(userRepository);
    }

    @Test
    void unknownEmail_countsAsAFailedAttempt() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "pass")))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(loginRateLimiter).recordFailedAttempt(EMAIL);
    }

    @Test
    void wrongPassword_countsAsAFailedAttemptAndNeverResets() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user()));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "wrong")))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(loginRateLimiter).recordFailedAttempt(EMAIL);
        verify(loginRateLimiter, never()).recordSuccessfulLogin(EMAIL);
        verifyNoInteractions(jwtService);
    }

    /* the same message for "no such user" and "wrong password", so a caller can't learn which emails exist */
    @Test
    void unknownEmailAndWrongPassword_giveTheSameMessage() {
        when(userRepository.findByEmailIgnoreCase("nobody@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user()));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        String unknownUser = messageOf(new LoginRequest("nobody@example.com", "pass"));
        String wrongPassword = messageOf(new LoginRequest(EMAIL, "wrong"));

        assertThat(unknownUser).isEqualTo(wrongPassword);
    }

    private String messageOf(LoginRequest request) {
        try {
            service.login(request);
            return "login succeeded";
        } catch (InvalidCredentialsException e) {
            return e.getMessage();
        }
    }

    @Test
    void correctCredentials_resetTheCounterAndReturnAToken() {
        User user = user();
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "hashed")).thenReturn(true);
        when(jwtService.generateToken(5L, EMAIL, Role.STUDENT)).thenReturn("the-token");

        LoginResponse response = service.login(new LoginRequest(EMAIL, "secret"));

        assertThat(response.token()).isEqualTo("the-token");
        assertThat(response.userId()).isEqualTo(5L);
        assertThat(response.role()).isEqualTo(Role.STUDENT);
        verify(loginRateLimiter).recordSuccessfulLogin(EMAIL);
        verify(loginRateLimiter, never()).recordFailedAttempt(EMAIL);
    }
}
