package com.finapp.security;

import com.finapp.services.exceptions.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

public final class JwtUserIdExtractor {

    private JwtUserIdExtractor() {
    }

    public static UUID extractUserId(Jwt jwt) {
        Object userIdClaim = jwt.getClaims().get("user_id");
        String rawUserId = userIdClaim != null ? userIdClaim.toString() : jwt.getSubject();

        if (rawUserId == null || rawUserId.isBlank()) {
            throw new AppException("Token does not contain user identifier", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }

        try {
            return UUID.fromString(rawUserId);
        } catch (IllegalArgumentException ex) {
            throw new AppException("Invalid user identifier in token", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
    }
}
