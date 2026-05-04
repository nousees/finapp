package com.finapp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.UUID;

/**
 * JWT Token Provider для верификации токенов из Go auth-service
 * Использует HS256 алгоритм с простым секретом (совместимо с Go)
 */
@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;

    public JwtTokenProvider(@Value("${app.jwt.secret:finapp-dev-secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
    }

    /**
     * Валидирует JWT токен и возвращает user_id
     */
    public UUID validateTokenAndGetUserId(String token) throws JwtException {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();

        String userIdStr = claims.get("user_id", String.class);
        if (userIdStr == null) {
            userIdStr = claims.getSubject();
        }

        if (userIdStr == null) {
            throw new JwtException("Token does not contain user_id");
        }

        try {
            return UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            throw new JwtException("Invalid user_id format in token");
        }
    }

    /**
     * Проверяет валидность токена
     */
    public boolean isTokenValid(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
