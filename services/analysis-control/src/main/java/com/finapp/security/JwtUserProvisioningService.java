package com.finapp.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JwtUserProvisioningService {

    private final JdbcTemplate jdbcTemplate;

    public void ensureUserExists(Jwt jwt) {
        UUID userId = JwtUserIdExtractor.extractUserId(jwt);
        String email = extractEmail(jwt, userId);
        String fullName = extractFullName(jwt);

        jdbcTemplate.update(
            """
            INSERT INTO users (id, email, password_hash, full_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING
            """,
            userId,
            email,
            "EXTERNAL_AUTH",
            fullName
        );

        log.debug("Ensured users row exists for external subject: {}", userId);
    }

    private String extractEmail(Jwt jwt, UUID userId) {
        String email = jwt.getClaimAsString("email");
        if (email != null && !email.isBlank()) {
            return email;
        }

        String preferredUsername = jwt.getClaimAsString("preferred_username");
        if (preferredUsername != null && !preferredUsername.isBlank()) {
            return preferredUsername + "@keycloak.local";
        }

        return userId + "@keycloak.local";
    }

    private String extractFullName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        if (name != null && !name.isBlank()) {
            return name;
        }

        String preferredUsername = jwt.getClaimAsString("preferred_username");
        if (preferredUsername != null && !preferredUsername.isBlank()) {
            return preferredUsername;
        }

        return "External User";
    }
}
