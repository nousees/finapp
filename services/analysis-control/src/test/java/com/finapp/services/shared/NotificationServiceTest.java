package com.finapp.services.shared;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finapp.models.shared.Notification;
import com.finapp.repositories.shared.NotificationRepository;
import com.finapp.repositories.shared.NotificationTemplateRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final NotificationTemplateRepository templateRepository = mock(NotificationTemplateRepository.class);
    private final NotificationService service = new NotificationService(
        notificationRepository,
        templateRepository,
        new ObjectMapper()
    );

    @Test
    void createsRichBudgetThresholdNotification() {
        UUID userId = UUID.randomUUID();
        UUID budgetId = UUID.randomUUID();
        when(notificationRepository.existsByUserIdAndTypeAndEntityTypeAndEntityIdAndCreatedAtAfter(
            eq(userId), eq("BUDGET_THRESHOLD"), eq("budget"), eq(budgetId), any()
        )).thenReturn(false);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.createBudgetThresholdNotification(
            userId,
            budgetId,
            "Продукты",
            BigDecimal.valueOf(8500),
            BigDecimal.valueOf(10000),
            85,
            BigDecimal.valueOf(1500),
            6L,
            BigDecimal.valueOf(250),
            "RUB"
        );

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification notification = captor.getValue();

        assertThat(notification.getType()).isEqualTo("BUDGET_THRESHOLD");
        assertThat(notification.getEntityType()).isEqualTo("budget");
        assertThat(notification.getEntityId()).isEqualTo(budgetId);
        assertThat(notification.getTitle()).contains("Продукты", "85%");
        assertThat(notification.getMessage()).contains("1500 RUB").contains("250 RUB");
        assertThat(notification.getData()).contains("OPEN_BUDGET").contains("SHOW_TRANSACTIONS").contains("safeDailyAmount");
    }

    @Test
    void skipsDuplicateSubscriptionNotificationsInsideDedupeWindow() {
        UUID userId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        when(notificationRepository.existsByUserIdAndTypeAndEntityTypeAndEntityIdAndCreatedAtAfter(
            eq(userId), eq("SUBSCRIPTION_RENEWAL"), eq("subscription"), eq(subscriptionId), any()
        )).thenReturn(true);

        Notification notification = service.createSubscriptionRenewalNotification(
            userId,
            subscriptionId,
            "Кинопоиск",
            BigDecimal.valueOf(399),
            1L,
            "RUB"
        );

        assertThat(notification).isNull();
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void keepsLegacyTemplateFallbackWorking() {
        UUID userId = UUID.randomUUID();
        UUID goalId = UUID.randomUUID();
        when(templateRepository.findByType("GOAL_PROGRESS")).thenReturn(Optional.empty());
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Notification notification = service.createNotificationFromTemplate(
            userId,
            "GOAL_PROGRESS",
            java.util.Map.of("goalName", "Отпуск", "currentAmount", "5000", "targetAmount", "20000", "progress", "25%"),
            "JAVA",
            "goal",
            goalId
        );

        assertThat(notification.getTitle()).isEqualTo("Прогресс цели: Отпуск");
        assertThat(notification.getMessage()).contains("5000", "20000", "25%");
    }
}
