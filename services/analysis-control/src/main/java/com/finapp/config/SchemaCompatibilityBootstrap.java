package com.finapp.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaCompatibilityBootstrap {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureCompatibilityColumns() {
        jdbcTemplate.execute("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP");
        log.info("Ensured compatibility columns are present");
    }
}
