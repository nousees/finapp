package com.finapp.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SystemCategoryBootstrap {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureSystemCategories() {
        jdbcTemplate.update(
            """
            INSERT INTO categories (id, user_id, name, type, color, icon, is_system)
            VALUES
                ('11111111-1111-1111-1111-111111111111', NULL, 'Продукты', 'EXPENSE', '#EF4444', 'shopping-cart', TRUE),
                ('22222222-2222-2222-2222-222222222222', NULL, 'Зарплата', 'INCOME', '#22C55E', 'wallet', TRUE),
                ('33333333-3333-3333-3333-333333333333', NULL, 'Накопления', 'TRANSFER', '#3B82F6', 'piggy-bank', TRUE)
            ON CONFLICT (id) DO NOTHING
            """
        );

        log.info("Ensured default system categories are present");
    }
}
