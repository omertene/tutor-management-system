package com.tutor.tutormanagementsystem.security;

import com.tutor.tutormanagementsystem.model.Role;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/* runs once per request, checks the Authorization header and logs the user
   in if the token is valid. registered before Spring's own auth filter in SecurityConfig. */
@RequiredArgsConstructor
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    /* if the token is missing/invalid we just continue unauthenticated -
       SecurityConfig's authorization rules are what actually reject with a 401 */
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7); /* remove "Bearer " */

        if (jwtService.isTokenValid(token)) {
            Long userId = jwtService.extractUserId(token);
            String email = jwtService.extractEmail(token);
            Role role = jwtService.extractRole(token);

            AuthenticatedUser principal = new AuthenticatedUser(userId, email, role);

            /* "ROLE_" prefix is needed for hasRole()/@PreAuthorize */
            List<SimpleGrantedAuthority> authorities =
                    List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));

            var authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, authorities);

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
