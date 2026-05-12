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
public class SystemCategoryBootstrap {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureSystemCategories() {
        jdbcTemplate.update(
            """
            INSERT INTO categories (id, user_id, name, type, color, icon, is_system)
            VALUES
                ('11111111-1111-1111-1111-111111111111', NULL, 'Продукты', 'EXPENSE', '#EF4444', 'shopping-cart', TRUE),
                ('44444444-4444-4444-4444-444444444444', NULL, 'Кафе и рестораны', 'EXPENSE', '#F97316', 'restaurant', TRUE),
                ('55555555-5555-5555-5555-555555555555', NULL, 'Транспорт', 'EXPENSE', '#0EA5E9', 'directions-car', TRUE),
                ('66666666-6666-6666-6666-666666666666', NULL, 'Развлечения', 'EXPENSE', '#A855F7', 'movie', TRUE),
                ('77777777-7777-7777-7777-777777777777', NULL, 'Здоровье', 'EXPENSE', '#14B8A6', 'local-hospital', TRUE),
                ('88888888-8888-8888-8888-888888888881', NULL, 'Жилье', 'EXPENSE', '#8B5CF6', 'home', TRUE),
                ('88888888-8888-8888-8888-888888888882', NULL, 'Коммунальные услуги', 'EXPENSE', '#06B6D4', 'water-drop', TRUE),
                ('88888888-8888-8888-8888-888888888883', NULL, 'Образование', 'EXPENSE', '#3B82F6', 'school', TRUE),
                ('88888888-8888-8888-8888-888888888884', NULL, 'Покупки', 'EXPENSE', '#EC4899', 'shopping-bag', TRUE),
                ('88888888-8888-8888-8888-888888888885', NULL, 'Одежда и обувь', 'EXPENSE', '#F43F5E', 'checkroom', TRUE),
                ('88888888-8888-8888-8888-888888888886', NULL, 'Подписки', 'EXPENSE', '#6366F1', 'subscriptions', TRUE),
                ('88888888-8888-8888-8888-888888888887', NULL, 'Путешествия', 'EXPENSE', '#0F766E', 'flight', TRUE),
                ('88888888-8888-8888-8888-888888888888', NULL, 'Семья и дети', 'EXPENSE', '#F59E0B', 'child-care', TRUE),
                ('88888888-8888-8888-8888-888888888889', NULL, 'Красота и уход', 'EXPENSE', '#D946EF', 'content-cut', TRUE),
                ('99999999-9999-9999-9999-999999999991', NULL, 'Спорт', 'EXPENSE', '#10B981', 'fitness-center', TRUE),
                ('99999999-9999-9999-9999-999999999992', NULL, 'Питомцы', 'EXPENSE', '#84CC16', 'pets', TRUE),
                ('99999999-9999-9999-9999-999999999993', NULL, 'Электроника', 'EXPENSE', '#64748B', 'smartphone', TRUE),
                ('99999999-9999-9999-9999-999999999994', NULL, 'Подарки', 'EXPENSE', '#FB7185', 'redeem', TRUE),
                ('99999999-9999-9999-9999-999999999995', NULL, 'Налоги и комиссии', 'EXPENSE', '#7C3AED', 'account-balance', TRUE),
                ('99999999-9999-9999-9999-999999999996', NULL, 'Прочее', 'EXPENSE', '#94A3B8', 'category', TRUE),

                ('22222222-2222-2222-2222-222222222222', NULL, 'Зарплата', 'INCOME', '#22C55E', 'wallet', TRUE),
                ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', NULL, 'Фриланс', 'INCOME', '#16A34A', 'work-outline', TRUE),
                ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', NULL, 'Бонусы и премии', 'INCOME', '#65A30D', 'emoji-events', TRUE),
                ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', NULL, 'Кэшбэк', 'INCOME', '#059669', 'savings', TRUE),
                ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', NULL, 'Подарки и переводы', 'INCOME', '#0D9488', 'north-east', TRUE),

                ('33333333-3333-3333-3333-333333333333', NULL, 'Накопления', 'TRANSFER', '#3B82F6', 'piggy-bank', TRUE),
                ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', NULL, 'Инвестиции', 'TRANSFER', '#2563EB', 'monitoring', TRUE)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                color = EXCLUDED.color,
                icon = EXCLUDED.icon,
                is_system = EXCLUDED.is_system
            """
        );

        normalizeLegacyTransactionCategories();
        log.info("Ensured extended system categories are present");
    }

    private void normalizeLegacyTransactionCategories() {
        remapTransactionsByCategoryName("Питание", "11111111-1111-1111-1111-111111111111");
        remapTransactionsByCategoryName("Кафе", "44444444-4444-4444-4444-444444444444");
        remapTransactionsByCategoryName("Доход", "22222222-2222-2222-2222-222222222222");
        remapTransactionsByCategoryName("Коммунальные", "88888888-8888-8888-8888-888888888882");
        remapTransactionsByCategoryName("Одежда", "88888888-8888-8888-8888-888888888885");
    }

    private void remapTransactionsByCategoryName(String legacyCategoryName, String targetCategoryId) {
        jdbcTemplate.update(
            """
            UPDATE transactions t
            SET category_id = CAST(? AS uuid)
            FROM categories c
            WHERE t.category_id = c.id
              AND LOWER(c.name) = LOWER(?)
            """,
            targetCategoryId,
            legacyCategoryName
        );

        jdbcTemplate.update(
            """
            UPDATE transactions t
            SET ml_category_id = CAST(? AS uuid)
            FROM categories c
            WHERE t.ml_category_id = c.id
              AND LOWER(c.name) = LOWER(?)
            """,
            targetCategoryId,
            legacyCategoryName
        );
    }
}
