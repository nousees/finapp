package com.finapp.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finapp.security.JwtUserProvisioningFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.security.cors.allowed-origins:http://localhost:8081,http://127.0.0.1:8081}")
    private List<String> allowedOrigins;

    private final JwtUserProvisioningFilter jwtUserProvisioningFilter;

    public SecurityConfig(JwtUserProvisioningFilter jwtUserProvisioningFilter) {
        this.jwtUserProvisioningFilter = jwtUserProvisioningFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/test/health").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .addFilterAfter(jwtUserProvisioningFilter, BearerTokenAuthenticationFilter.class);

        return http.build();
    }


    @Bean
    public JwtDecoder jwtDecoder(@Value("${app.jwt.secret:${JWT_SECRET:finapp-dev-secret}}") String secret) {
        return new HmacJwtDecoder(secret);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>(grantedAuthoritiesConverter.convert(jwt));
            authorities.addAll(extractRoles(jwt));
            authorities.addAll(defaultApplicationScopes(authorities));
            return authorities;
        });

        return converter;
    }

    private Collection<GrantedAuthority> defaultApplicationScopes(Collection<GrantedAuthority> authorities) {
        boolean hasScope = authorities.stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(authority -> authority.startsWith("SCOPE_"));
        if (hasScope) {
            return List.of();
        }

        return List.of(
            "budgets:read",
            "budgets:write",
            "goals:read",
            "goals:write",
            "reports:read",
            "reports:write",
            "dashboard:read",
            "dashboard:write",
            "recommendations:read",
            "recommendations:write",
            "notifications:read",
            "notifications:write"
        ).stream()
            .map(scope -> "SCOPE_" + scope)
            .map(SimpleGrantedAuthority::new)
            .map(GrantedAuthority.class::cast)
            .toList();
    }

    private Collection<GrantedAuthority> extractRoles(Jwt jwt) {
        List<GrantedAuthority> roles = new ArrayList<>();

        Object rolesClaim = jwt.getClaims().get("roles");
        if (rolesClaim instanceof Collection<?> collection) {
            collection.stream()
                .map(Object::toString)
                .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                .map(SimpleGrantedAuthority::new)
                .forEach(roles::add);
        }

        Object realmAccess = jwt.getClaims().get("realm_access");
        if (realmAccess instanceof Map<?, ?> map) {
            Object realmRoles = map.get("roles");
            if (realmRoles instanceof Collection<?> collection) {
                collection.stream()
                    .map(Object::toString)
                    .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                    .map(SimpleGrantedAuthority::new)
                    .forEach(roles::add);
            }
        }

        return roles;
    }

    private static final class HmacJwtDecoder implements JwtDecoder {
        private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
        private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
        };

        private final byte[] secret;

        private HmacJwtDecoder(String secret) {
            this.secret = secret.getBytes(StandardCharsets.UTF_8);
        }

        @Override
        public Jwt decode(String token) throws JwtException {
            try {
                String[] parts = token.split("\\.");
                if (parts.length != 3) {
                    throw new JwtException("Invalid JWT format");
                }

                Map<String, Object> headers = decodeJsonPart(parts[0]);
                String algorithm = String.valueOf(headers.getOrDefault("alg", ""));
                if (!"HS256".equals(algorithm)) {
                    throw new JwtException("Unsupported JWT algorithm: " + algorithm);
                }

                verifySignature(token, parts);
                Map<String, Object> claims = decodeJsonPart(parts[1]);
                Instant issuedAt = instantClaim(claims.get("iat"));
                Instant expiresAt = instantClaim(claims.get("exp"));
                Instant now = Instant.now();

                if (expiresAt != null && expiresAt.isBefore(now)) {
                    throw new JwtException("JWT has expired");
                }
                Instant notBefore = instantClaim(claims.get("nbf"));
                if (notBefore != null && notBefore.isAfter(now)) {
                    throw new JwtException("JWT is not valid yet");
                }

                return new Jwt(token, issuedAt, expiresAt, headers, claims);
            } catch (JwtException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new JwtException("Unable to decode JWT", ex);
            }
        }

        private void verifySignature(String token, String[] parts) throws Exception {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] expectedSignature = mac.doFinal((parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8));
            byte[] actualSignature = Base64.getUrlDecoder().decode(parts[2]);

            if (!MessageDigest.isEqual(expectedSignature, actualSignature)) {
                throw new JwtException("Invalid JWT signature");
            }
        }

        private Map<String, Object> decodeJsonPart(String value) throws Exception {
            byte[] decoded = Base64.getUrlDecoder().decode(value);
            return new LinkedHashMap<>(OBJECT_MAPPER.readValue(decoded, MAP_TYPE));
        }

        private Instant instantClaim(Object value) {
            if (value instanceof Number number) {
                return Instant.ofEpochSecond(number.longValue());
            }
            if (value instanceof String string && !string.isBlank()) {
                return Instant.ofEpochSecond(Long.parseLong(string));
            }
            return null;
        }
    }

}
