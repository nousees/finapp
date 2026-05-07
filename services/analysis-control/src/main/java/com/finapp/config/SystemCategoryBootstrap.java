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
                ('33333333-3333-3333-3333-333333333333', NULL, 'Накопления', 'TRANSFER', '#3B82F6', 'piggy-bank', TRUE),
                ('44444444-4444-4444-4444-444444444444', NULL, 'Кафе и рестораны', 'EXPENSE', '#F97316', 'restaurant', TRUE),
                ('55555555-5555-5555-5555-555555555555', NULL, 'Транспорт', 'EXPENSE', '#0EA5E9', 'directions-car', TRUE),
                ('66666666-6666-6666-6666-666666666666', NULL, 'Развлечения', 'EXPENSE', '#A855F7', 'movie', TRUE),
                ('77777777-7777-7777-7777-777777777777', NULL, 'Здоровье', 'EXPENSE', '#14B8A6', 'local-hospital', TRUE)
            ON CONFLICT (id) DO NOTHING
            """
        );

        log.info("Ensured default system categories are present");
    }
}
