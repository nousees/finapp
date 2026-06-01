package com.finapp.services.shared;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.notifications.smart", name = "enabled", havingValue = "true", matchIfMissing = true)
public class FinancialNotificationScheduler {

    private final JdbcTemplate jdbcTemplate;
    private final FinancialNotificationService financialNotificationService;

    @Scheduled(cron = "${app.notifications.smart.cron:0 0 9,18 * * *}")
    public void generateForActiveUsers() {
        List<UUID> userIds = jdbcTemplate.queryForList("SELECT id FROM users", UUID.class);
        for (UUID userId : userIds) {
            try {
                financialNotificationService.generateSmartNotifications(userId);
            } catch (Exception e) {
                log.warn("Smart notification generation failed for user {}: {}", userId, e.getMessage());
            }
        }
    }
}
