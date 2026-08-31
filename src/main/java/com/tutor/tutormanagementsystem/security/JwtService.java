package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

/* creates and validates the JWTs - the only place that knows about jjwt itself */
@Service
public class JwtService {

    private final SecretKey secretKey;

    private static final long EXPIRATION_MS = 1000 * 60 * 60 * 24; /* 24 hours */

    /* secret comes from application.properties as base64, decode it into a key */
    public JwtService(@Value("${jwt.secret}") String secret) {
        byte[] keyBytes = Base64.getDecoder().decode(secret);
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    /* builds a signed token carrying the user's id, email and role */
    public String generateToken(Long userId, String email, Role role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + EXPIRATION_MS);

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("role", role.name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /* pulls the email back out of the token's subject claim */
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /* pulls the userId custom claim back out */
    public Long extractUserId(String token) {
        return parseClaims(token).get("userId", Long.class);
    }

    /* pulls the role claim back out and turns it into a Role enum */
    public Role extractRole(String token) {
        String roleName = parseClaims(token).get("role", String.class);
        return Role.valueOf(roleName);
    }

    /* true if the token parses and verifies - false for any bad signature,
       malformed token or expired one */
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /* parses the token and verifies its signature, throws if it was tampered with */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
