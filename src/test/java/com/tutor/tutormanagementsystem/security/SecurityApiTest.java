package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.model.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/* end-to-end test of the security chain: the real application starts on a random port with the real
   filters, and a plain Java HttpClient sends real HTTP requests to it. Nothing in the security layer is faked.
   It uses a protected teacher endpoint (GET /teacher/students) and the public login endpoint.
   tokens are made with the real JwtService, so no user has to exist in the database for them. */

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SecurityApiTest {

    private static final String PROTECTED_PATH = "/teacher/students";

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private JwtService jwtService;

    private final HttpClient client = HttpClient.newHttpClient();

    private int get(String path, String bearerToken) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET();
        if (bearerToken != null) {
            request.header("Authorization", "Bearer " + bearerToken);
        }
        return client.send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private int login(String email, String password) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private String teacherToken() {
        return jwtService.generateToken(1L, "teacher@example.com", Role.TEACHER);
    }

    private String studentToken() {
        return jwtService.generateToken(2L, "student@example.com", Role.STUDENT);
    }

    /* ---------- who may call a protected endpoint ---------- */

    /* the app answers 401 or 403 to a caller that is not logged in - what matters is that it is rejected */
    @Test
    void protectedEndpoint_withoutAToken_isRejected() throws Exception {
        assertThat(get(PROTECTED_PATH, null)).isIn(401, 403);
    }

    @Test
    void protectedEndpoint_withAGarbageToken_isRejected() throws Exception {
        assertThat(get(PROTECTED_PATH, "not-a-real-token")).isIn(401, 403);
    }

    /* a real token with one character changed inside its signature must not be accepted */
    @Test
    void protectedEndpoint_withATamperedToken_isRejected() throws Exception {
        String token = teacherToken();
        int index = token.length() - 5;
        char changed = token.charAt(index) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, index) + changed + token.substring(index + 1);

        assertThat(get(PROTECTED_PATH, tampered)).isIn(401, 403);
    }

    @Test
    void teacherEndpoint_withAStudentToken_isForbidden() throws Exception {
        assertThat(get(PROTECTED_PATH, studentToken())).isEqualTo(403);
    }

    @Test
    void teacherEndpoint_withATeacherToken_isAllowed() throws Exception {
        assertThat(get(PROTECTED_PATH, teacherToken())).isEqualTo(200);
    }

    /* ---------- the public login endpoint ---------- */

    @Test
    void login_withUnknownCredentials_returns401() throws Exception {
        String email = "nobody-" + UUID.randomUUID() + "@example.com";

        assertThat(login(email, "wrong-password")).isEqualTo(401);
    }

    /* four wrong attempts are answered with 401, the fifth locks the email, and from then on every attempt gets 429 */
    @Test
    void login_afterFiveFailures_isLockedOut() throws Exception {
        String email = "locked-" + UUID.randomUUID() + "@example.com";

        for (int attempt = 1; attempt <= 4; attempt++) {
            assertThat(login(email, "wrong-password")).isEqualTo(401);
        }

        assertThat(login(email, "wrong-password")).isEqualTo(429);
        assertThat(login(email, "wrong-password")).isEqualTo(429);
    }
}
