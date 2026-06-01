package com.finapp.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(prefix = "app.bootstrap", name = "enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class SchemaCompatibilityBootstrap {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureCompatibilityColumns() {
        jdbcTemplate.execute("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP");
        jdbcTemplate.execute(
            """
            CREATE TABLE IF NOT EXISTS recommendation_events (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL,
                recommendation_id UUID NOT NULL,
                event_type VARCHAR(32) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            """
        );
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_recommendation_events_recommendation_id ON recommendation_events(recommendation_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_id ON recommendation_events(user_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_type_entity_created ON notifications(user_id, type, entity_type, entity_id, created_at DESC)");
        log.info("Ensured compatibility columns are present");
    }
}
