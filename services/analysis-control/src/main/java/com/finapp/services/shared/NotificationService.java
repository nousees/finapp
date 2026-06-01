package com.finapp.services.shared;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finapp.models.enums.NotificationType;
import com.finapp.models.shared.Notification;
import com.finapp.models.shared.NotificationTemplate;
import com.finapp.repositories.shared.NotificationRepository;
import com.finapp.repositories.shared.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Duration DEFAULT_DEDUPE_WINDOW = Duration.ofHours(20);
    private static final Duration HIGH_PRIORITY_DEDUPE_WINDOW = Duration.ofHours(6);

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;
    private final ObjectMapper objectMapper;

    public List<Notification> getUserNotifications(UUID userId) {
        return notificationRepository.findByUserId(userId);
    }

    public Page<Notification> getUserNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserId(userId, pageable);
    }

    public List<Notification> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    public Long getUnreadCount(UUID userId) {
        return notificationRepository.countUnreadNotifications(userId);
    }

    @Transactional
    public Notification createNotification(UUID userId, String type, String title,
                                           String message, String sourceModule,
                                           String entityType, UUID entityId,
                                           Map<String, Object> data) {
        log.info("Creating notification type {} for user: {}", type, userId);

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setSourceModule(sourceModule);
        notification.setEntityType(entityType);
        notification.setEntityId(entityId);

        if (data != null) {
            try {
                notification.setData(objectMapper.writeValueAsString(data));
            } catch (JsonProcessingException e) {
                log.error("Error converting notification data to JSON", e);
            }
        }

        return notificationRepository.save(notification);
    }

    @Transactional
    public Notification createNotificationFromTemplate(UUID userId, String templateType,
                                                       Map<String, String> parameters,
                                                       String sourceModule,
                                                       String entityType, UUID entityId) {
        Map<String, String> safeParameters = parameters != null ? parameters : Map.of();
        NotificationTemplate template = notificationTemplateRepository.findByType(templateType)
            .orElse(null);

        String title = template != null
            ? replacePlaceholders(template.getTitleTemplate(), safeParameters)
            : defaultTitle(templateType, safeParameters);
        String message = template != null
            ? replacePlaceholders(template.getMessageTemplate(), safeParameters)
            : defaultMessage(templateType, safeParameters);

        return createNotification(userId, templateType, title, message,
            sourceModule, entityType, entityId, null);
    }

    @Transactional
    public Notification createBudgetAlert(UUID userId, UUID budgetId,
                                          String budgetName, Double currentSpent,
                                          Double limit, Integer threshold) {
        BigDecimal spent = decimal(currentSpent);
        BigDecimal budgetLimit = decimal(limit);
        BigDecimal remaining = budgetLimit.subtract(spent).max(BigDecimal.ZERO);
        return createBudgetThresholdNotification(
            userId,
            budgetId,
            budgetName,
            spent,
            budgetLimit,
            threshold,
            remaining,
            null,
            null,
            "RUB"
        );
    }

    @Transactional
    public Notification createBudgetThresholdNotification(UUID userId, UUID budgetId, String budgetName,
                                                          BigDecimal spent, BigDecimal limit, Integer threshold,
                                                          BigDecimal remaining, Long daysLeft,
                                                          BigDecimal safeDailyAmount, String currency) {
        BigDecimal percentage = percent(spent, limit);
        String type = percentage.compareTo(BigDecimal.valueOf(100)) >= 0
            ? NotificationType.BUDGET_EXCEEDED.name()
            : NotificationType.BUDGET_THRESHOLD.name();
        Integer safeThreshold = threshold == null ? percentage.setScale(0, RoundingMode.HALF_UP).intValue() : threshold;
        String title = percentage.compareTo(BigDecimal.valueOf(100)) >= 0
            ? "Бюджет превышен: " + budgetName
            : "Бюджет “" + budgetName + "” на " + safeThreshold + "%";
        String message = percentage.compareTo(BigDecimal.valueOf(100)) >= 0
            ? "Лимит " + money(limit, currency) + " превышен на " + money(spent.subtract(limit).max(BigDecimal.ZERO), currency) + ". Проверьте последние траты."
            : "Осталось " + money(remaining, currency) + suffixDaysAndDaily(daysLeft, safeDailyAmount, currency) + ".";

        return createTypedNotification(userId, type, title, message, "JAVA", "budget", budgetId,
            data("warning", "OPEN_BUDGET", "SHOW_TRANSACTIONS",
                "budgetName", budgetName,
                "spent", moneyValue(spent),
                "limit", moneyValue(limit),
                "remaining", moneyValue(remaining),
                "threshold", safeThreshold,
                "percentage", moneyValue(percentage),
                "daysLeft", daysLeft,
                "safeDailyAmount", moneyValue(safeDailyAmount),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createBudgetForecastRisk(UUID userId, UUID budgetId, String budgetName,
                                                 BigDecimal spent, BigDecimal limit, Long daysPassed,
                                                 Long daysTotal, BigDecimal projectedSpent,
                                                 String currency) {
        String message = "По текущему темпу расходы могут составить " + money(projectedSpent, currency)
            + " при лимите " + money(limit, currency) + ". Ещё можно скорректировать траты.";
        return createTypedNotification(userId, NotificationType.BUDGET_FORECAST_RISK.name(),
            "Темп расходов выше плана", message, "JAVA", "budget", budgetId,
            data("warning", "OPEN_BUDGET", "SET_DAILY_LIMIT",
                "budgetName", budgetName,
                "spent", moneyValue(spent),
                "limit", moneyValue(limit),
                "daysPassed", daysPassed,
                "daysTotal", daysTotal,
                "projectedSpent", moneyValue(projectedSpent),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createDailySafeLimit(UUID userId, UUID budgetId, String budgetName,
                                             BigDecimal remaining, Long daysLeft,
                                             BigDecimal safeDailyAmount, String currency) {
        String message = "До конца периода " + daysText(daysLeft) + ". Безопасный лимит — "
            + money(safeDailyAmount, currency) + " в день.";
        return createTypedNotification(userId, NotificationType.DAILY_SAFE_LIMIT.name(),
            "Дневной лимит по бюджету", message, "JAVA", "budget", budgetId,
            data("info", "OPEN_BUDGET", "SHOW_TRANSACTIONS",
                "budgetName", budgetName,
                "remaining", moneyValue(remaining),
                "daysLeft", daysLeft,
                "safeDailyAmount", moneyValue(safeDailyAmount),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createBudgetPeriodEnding(UUID userId, UUID budgetId, String budgetName,
                                                 BigDecimal remaining, Long daysLeft,
                                                 BigDecimal safeDailyAmount, String currency) {
        String message = "Осталось " + money(remaining, currency) + " на " + daysText(daysLeft)
            + ". Ориентир — " + money(safeDailyAmount, currency) + " в день.";
        return createTypedNotification(userId, NotificationType.BUDGET_PERIOD_ENDING.name(),
            "Бюджетный период скоро закончится", message, "JAVA", "budget", budgetId,
            data("info", "OPEN_BUDGET", "SHOW_PLAN",
                "budgetName", budgetName,
                "remaining", moneyValue(remaining),
                "daysLeft", daysLeft,
                "safeDailyAmount", moneyValue(safeDailyAmount),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createGoalProgressNotification(UUID userId, UUID goalId,
                                                       String goalName, Double currentAmount,
                                                       Double targetAmount, Double progress) {
        return createGoalProgressNotification(userId, goalId, goalName,
            decimal(currentAmount), decimal(targetAmount), decimal(progress), "RUB");
    }

    @Transactional
    public Notification createGoalProgressNotification(UUID userId, UUID goalId, String goalName,
                                                       BigDecimal currentAmount, BigDecimal targetAmount,
                                                       BigDecimal progress, String currency) {
        String message = "Накоплено " + money(currentAmount, currency) + " из "
            + money(targetAmount, currency) + " (" + percentText(progress) + ").";
        return createTypedNotification(userId, NotificationType.GOAL_PROGRESS.name(),
            "Прогресс цели: " + goalName, message, "JAVA", "goal", goalId,
            data("positive", "OPEN_GOAL", "ADD_TO_GOAL",
                "goalName", goalName,
                "currentAmount", moneyValue(currentAmount),
                "targetAmount", moneyValue(targetAmount),
                "progress", moneyValue(progress),
                "currency", safeCurrency(currency)),
            HIGH_PRIORITY_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createGoalContributionDue(UUID userId, UUID goalId, String goalName,
                                                  BigDecimal requiredAmount, Long daysLeft,
                                                  String currency) {
        String message = "Чтобы сохранить план, внесите " + money(requiredAmount, currency)
            + " в ближайшее время. До срока: " + daysText(daysLeft) + ".";
        return createTypedNotification(userId, NotificationType.GOAL_CONTRIBUTION_DUE.name(),
            "Пора пополнить цель “" + goalName + "”", message, "JAVA", "goal", goalId,
            data("info", "ADD_TO_GOAL", "REMIND_TOMORROW",
                "goalName", goalName,
                "requiredAmount", moneyValue(requiredAmount),
                "daysLeft", daysLeft,
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createGoalBehindSchedule(UUID userId, UUID goalId, String goalName,
                                                 BigDecimal requiredMonthlyAmount,
                                                 BigDecimal currentProgress,
                                                 BigDecimal expectedProgress,
                                                 String currency) {
        String message = "Текущий прогресс " + percentText(currentProgress) + ", плановый — "
            + percentText(expectedProgress) + ". Нужно откладывать около "
            + money(requiredMonthlyAmount, currency) + " в месяц.";
        return createTypedNotification(userId, NotificationType.GOAL_BEHIND_SCHEDULE.name(),
            "Цель “" + goalName + "” отстаёт", message, "JAVA", "goal", goalId,
            data("warning", "ADD_TO_GOAL", "EDIT_GOAL_PLAN",
                "goalName", goalName,
                "requiredMonthlyAmount", moneyValue(requiredMonthlyAmount),
                "currentProgress", moneyValue(currentProgress),
                "expectedProgress", moneyValue(expectedProgress),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createGoalDeadlineRisk(UUID userId, UUID goalId, String goalName,
                                               BigDecimal remainingAmount, Long daysLeft,
                                               String currency) {
        String message = "Осталось " + daysText(daysLeft) + " и " + money(remainingAmount, currency)
            + " до цели. Проверьте план пополнений.";
        return createTypedNotification(userId, NotificationType.GOAL_DEADLINE_RISK.name(),
            "Цель может не успеть", message, "JAVA", "goal", goalId,
            data("critical", "ADD_TO_GOAL", "EDIT_GOAL_DEADLINE",
                "goalName", goalName,
                "remainingAmount", moneyValue(remainingAmount),
                "daysLeft", daysLeft,
                "currency", safeCurrency(currency)),
            HIGH_PRIORITY_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createGoalAlmostCompleted(UUID userId, UUID goalId, String goalName,
                                                  BigDecimal remainingAmount, BigDecimal progress,
                                                  String currency) {
        String message = "До цели осталось " + money(remainingAmount, currency)
            + " (готово " + percentText(progress) + "). Можно закрыть её досрочно.";
        return createTypedNotification(userId, NotificationType.GOAL_ALMOST_COMPLETED.name(),
            "До цели осталось немного", message, "JAVA", "goal", goalId,
            data("positive", "ADD_TO_GOAL", "OPEN_GOAL",
                "goalName", goalName,
                "remainingAmount", moneyValue(remainingAmount),
                "progress", moneyValue(progress),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createGoalCompleted(UUID userId, UUID goalId, String goalName,
                                            BigDecimal targetAmount, String currency) {
        String message = "Цель закрыта: накоплено " + money(targetAmount, currency)
            + ". Отличный результат.";
        return createTypedNotification(userId, NotificationType.GOAL_COMPLETED.name(),
            "Цель достигнута: " + goalName, message, "JAVA", "goal", goalId,
            data("positive", "OPEN_GOAL", "MOVE_TO_SAVINGS",
                "goalName", goalName,
                "targetAmount", moneyValue(targetAmount),
                "currency", safeCurrency(currency)),
            Duration.ofDays(365));
    }

    @Transactional
    public Notification createLargeTransactionNotification(UUID userId, UUID transactionId,
                                                           BigDecimal amount, String category,
                                                           String merchant, String currency) {
        String message = "Операция " + money(amount, currency) + " в категории “" + fallback(category, "Расходы")
            + "”. Проверьте влияние на бюджет.";
        return createTypedNotification(userId, NotificationType.LARGE_TRANSACTION.name(),
            "Крупная трата", message, "JAVA", "transaction", transactionId,
            data("warning", "OPEN_TRANSACTION", "SHOW_BUDGET_IMPACT",
                "amount", moneyValue(amount),
                "category", category,
                "merchant", merchant,
                "currency", safeCurrency(currency)),
            HIGH_PRIORITY_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createUnusualTransactionNotification(UUID userId, UUID transactionId,
                                                             BigDecimal amount, String category,
                                                             String merchant, String reason,
                                                             String currency) {
        String message = fallback(merchant, "Операция") + " на " + money(amount, currency)
            + " выглядит нетипично: " + fallback(reason, "отличается от обычных расходов") + ".";
        return createTypedNotification(userId, NotificationType.UNUSUAL_TRANSACTION.name(),
            "Нетипичная трата", message, "JAVA", "transaction", transactionId,
            data("warning", "OPEN_TRANSACTION", "CHANGE_CATEGORY",
                "amount", moneyValue(amount),
                "category", category,
                "merchant", merchant,
                "reason", reason,
                "currency", safeCurrency(currency)),
            HIGH_PRIORITY_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createCategorySpikeNotification(UUID userId, UUID categoryId,
                                                        String categoryName, BigDecimal currentAmount,
                                                        BigDecimal averageAmount, BigDecimal growthPercent,
                                                        String currency) {
        String message = "Расходы “" + categoryName + "” выше обычного на "
            + percentText(growthPercent) + ": " + money(currentAmount, currency)
            + " против среднего " + money(averageAmount, currency) + ".";
        return createTypedNotification(userId, NotificationType.CATEGORY_SPIKE.name(),
            "Расходы в категории выросли", message, "JAVA", "category", categoryId,
            data("warning", "SHOW_CATEGORY_TRANSACTIONS", "SET_CATEGORY_LIMIT",
                "categoryName", categoryName,
                "currentAmount", moneyValue(currentAmount),
                "averageAmount", moneyValue(averageAmount),
                "growthPercent", moneyValue(growthPercent),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createRecurringTransactionDetected(UUID userId, UUID transactionId,
                                                           String merchant, BigDecimal amount,
                                                           String recurrence, String currency) {
        String message = "Похоже на регулярный платёж: " + fallback(merchant, "операция")
            + " — " + money(amount, currency) + ", " + fallback(recurrence, "периодически") + ".";
        return createTypedNotification(userId, NotificationType.RECURRING_TRANSACTION_DETECTED.name(),
            "Новая повторяющаяся трата", message, "JAVA", "transaction", transactionId,
            data("info", "OPEN_TRANSACTION", "MARK_AS_SUBSCRIPTION",
                "merchant", merchant,
                "amount", moneyValue(amount),
                "recurrence", recurrence,
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createSubscriptionRenewalNotification(UUID userId, UUID subscriptionId,
                                                              String subscriptionName, BigDecimal amount,
                                                              Long daysLeft, String currency) {
        String message = money(amount, currency) + " спишутся "
            + (daysLeft != null && daysLeft <= 1 ? "примерно завтра" : "через " + daysText(daysLeft))
            + ". Проверьте, нужна ли подписка.";
        return createTypedNotification(userId, NotificationType.SUBSCRIPTION_RENEWAL.name(),
            "Скоро спишется " + subscriptionName, message, "JAVA", "subscription", subscriptionId,
            data("info", "OPEN_SUBSCRIPTION", "REMIND_LATER",
                "subscriptionName", subscriptionName,
                "amount", moneyValue(amount),
                "daysLeft", daysLeft,
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createSubscriptionUnusedNotification(UUID userId, UUID subscriptionId,
                                                             String subscriptionName, BigDecimal amount,
                                                             BigDecimal usageIndex, BigDecimal budgetImpact,
                                                             String currency) {
        BigDecimal safeUsageIndex = nullToZero(usageIndex);
        String message = "Подписка стоит " + money(amount, currency) + "/мес, использование — "
            + percentText(safeUsageIndex.multiply(BigDecimal.valueOf(100))) + ". Ответьте на один вопрос перед отменой.";
        return createTypedNotification(userId, NotificationType.SUBSCRIPTION_UNUSED.name(),
            "Проверить подписку: " + subscriptionName, message, "JAVA", "subscription", subscriptionId,
            data("warning", "OPEN_SUBSCRIPTION", "ANSWER_SUBSCRIPTION_FEEDBACK",
                "subscriptionName", subscriptionName,
                "amount", moneyValue(amount),
                "usageIndex", moneyValue(safeUsageIndex),
                "budgetImpact", moneyValue(budgetImpact),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createSubscriptionDuplicateNotification(UUID userId, String subscriptionGroup,
                                                                List<UUID> subscriptionIds,
                                                                BigDecimal totalMonthlyAmount,
                                                                String currency) {
        String message = "Найдено похожих подписок: " + (subscriptionIds == null ? 0 : subscriptionIds.size())
            + ". Вместе — " + money(totalMonthlyAmount, currency) + "/мес.";
        return createTypedNotification(userId, NotificationType.SUBSCRIPTION_DUPLICATE.name(),
            "Похожие подписки", message, "JAVA", "subscription", firstId(subscriptionIds),
            data("warning", "COMPARE_SUBSCRIPTIONS", "OPEN_SUBSCRIPTIONS",
                "subscriptionGroup", subscriptionGroup,
                "subscriptionIds", subscriptionIds,
                "totalMonthlyAmount", moneyValue(totalMonthlyAmount),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public Notification createSubscriptionPriceIncreaseNotification(UUID userId, UUID subscriptionId,
                                                                    String subscriptionName,
                                                                    BigDecimal previousAmount,
                                                                    BigDecimal newAmount,
                                                                    String currency) {
        BigDecimal safePreviousAmount = nullToZero(previousAmount);
        BigDecimal safeNewAmount = nullToZero(newAmount);
        BigDecimal increase = safeNewAmount.subtract(safePreviousAmount).max(BigDecimal.ZERO);
        String message = "Стоимость выросла с " + money(safePreviousAmount, currency) + " до "
            + money(safeNewAmount, currency) + " (+" + money(increase, currency) + ").";
        return createTypedNotification(userId, NotificationType.SUBSCRIPTION_PRICE_INCREASE.name(),
            "Подписка подорожала", message, "JAVA", "subscription", subscriptionId,
            data("warning", "OPEN_SUBSCRIPTION", "CHECK_TARIFF",
                "subscriptionName", subscriptionName,
                "previousAmount", moneyValue(safePreviousAmount),
                "newAmount", moneyValue(safeNewAmount),
                "increase", moneyValue(increase),
                "currency", safeCurrency(currency)),
            DEFAULT_DEDUPE_WINDOW);
    }

    @Transactional
    public void markAsRead(UUID userId, List<UUID> notificationIds) {
        if (notificationIds == null || notificationIds.isEmpty()) {
            List<Notification> unread = getUnreadNotifications(userId);
            notificationIds = unread.stream()
                .map(Notification::getId)
                .collect(Collectors.toList());
        }

        if (!notificationIds.isEmpty()) {
            notificationRepository.markAsRead(notificationIds, userId);
            log.info("Marked {} notifications as read for user: {}",
                notificationIds.size(), userId);
        }
    }

    @Transactional
    public void cleanupOldNotifications(UUID userId, int daysToKeep) {
        OffsetDateTime cutoffDate = OffsetDateTime.now().minusDays(daysToKeep);
        notificationRepository.deleteOldReadNotifications(userId, cutoffDate);
    }

    @Transactional
    public void sendScheduledNotifications() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Notification> scheduled = notificationRepository
            .findScheduledNotifications(null, now);

        for (Notification notification : scheduled) {
            log.info("Sending scheduled notification: {}", notification.getId());
        }
    }

    private Notification createTypedNotification(UUID userId, String type, String title,
                                                 String message, String sourceModule,
                                                 String entityType, UUID entityId,
                                                 Map<String, Object> data,
                                                 Duration dedupeWindow) {
        if (entityId != null && dedupeWindow != null) {
            boolean alreadyExists = notificationRepository.existsByUserIdAndTypeAndEntityTypeAndEntityIdAndCreatedAtAfter(
                userId, type, entityType, entityId, OffsetDateTime.now().minus(dedupeWindow));
            if (alreadyExists) {
                log.debug("Skip duplicate notification {} for {} {}", type, entityType, entityId);
                return null;
            }
        }
        return createNotification(userId, type, title, message, sourceModule, entityType, entityId, data);
    }

    private String replacePlaceholders(String template, Map<String, String> parameters) {
        String result = template;
        for (Map.Entry<String, String> entry : parameters.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }

    private String defaultTitle(String templateType, Map<String, String> parameters) {
        return switch (templateType) {
            case "BUDGET_ALERT", "BUDGET_THRESHOLD" -> "Бюджет “" + parameters.getOrDefault("budgetName", "") + "” достиг порога";
            case "BUDGET_EXCEEDED" -> "Бюджет превышен: " + parameters.getOrDefault("budgetName", "");
            case "BUDGET_FORECAST_RISK" -> "Темп расходов выше плана";
            case "DAILY_SAFE_LIMIT" -> "Дневной лимит по бюджету";
            case "BUDGET_PERIOD_ENDING" -> "Бюджетный период скоро закончится";
            case "GOAL_PROGRESS" -> "Прогресс цели: " + parameters.getOrDefault("goalName", "");
            case "GOAL_CONTRIBUTION_DUE" -> "Пора пополнить цель “" + parameters.getOrDefault("goalName", "") + "”";
            case "GOAL_BEHIND_SCHEDULE" -> "Цель отстаёт от плана";
            case "GOAL_DEADLINE_RISK" -> "Цель может не успеть";
            case "GOAL_ALMOST_COMPLETED" -> "До цели осталось немного";
            case "GOAL_COMPLETED" -> "Цель достигнута";
            case "SUBSCRIPTION_REMINDER", "SUBSCRIPTION_RENEWAL" -> "Напоминание о подписке";
            case "SUBSCRIPTION_UNUSED" -> "Проверить подписку";
            case "SUBSCRIPTION_DUPLICATE" -> "Похожие подписки";
            case "SUBSCRIPTION_PRICE_INCREASE" -> "Подписка подорожала";
            case "LARGE_TRANSACTION" -> "Крупная операция";
            case "UNUSUAL_TRANSACTION" -> "Нетипичная трата";
            case "CATEGORY_SPIKE" -> "Расходы в категории выросли";
            case "RECURRING_TRANSACTION_DETECTED" -> "Новая повторяющаяся трата";
            default -> "Событие FinApp";
        };
    }

    private String defaultMessage(String templateType, Map<String, String> parameters) {
        return switch (templateType) {
            case "BUDGET_ALERT", "BUDGET_THRESHOLD" -> "Потрачено " + parameters.getOrDefault("currentSpent", "0")
                + " из " + parameters.getOrDefault("limit", "0")
                + " (" + parameters.getOrDefault("percentage", "0%") + ").";
            case "BUDGET_EXCEEDED" -> "Лимит превышен. Проверьте последние операции.";
            case "BUDGET_FORECAST_RISK" -> "По текущему темпу бюджет может закончиться раньше срока.";
            case "DAILY_SAFE_LIMIT" -> "Проверьте безопасный дневной лимит до конца периода.";
            case "BUDGET_PERIOD_ENDING" -> "До конца периода осталось мало времени. Проверьте остаток бюджета.";
            case "GOAL_PROGRESS" -> "Накоплено " + parameters.getOrDefault("currentAmount", "0")
                + " из " + parameters.getOrDefault("targetAmount", "0")
                + " (" + parameters.getOrDefault("progress", "0%") + ").";
            case "GOAL_CONTRIBUTION_DUE" -> "Чтобы сохранить план, внесите очередной платёж по цели.";
            case "GOAL_BEHIND_SCHEDULE" -> "Цель отстаёт от графика. Проверьте план пополнений.";
            case "GOAL_DEADLINE_RISK" -> "Срок цели близко, а нужная сумма ещё не накоплена.";
            case "GOAL_ALMOST_COMPLETED" -> "До цели осталось немного. Можно закрыть её досрочно.";
            case "GOAL_COMPLETED" -> "Цель достигнута. Отличный результат.";
            case "SUBSCRIPTION_REMINDER", "SUBSCRIPTION_RENEWAL" -> "Ожидается списание по подписке "
                + parameters.getOrDefault("subscriptionName", "") + ".";
            case "SUBSCRIPTION_UNUSED" -> "Подписка выглядит редко используемой. Уточните, нужна ли она.";
            case "SUBSCRIPTION_DUPLICATE" -> "Есть несколько похожих подписок. Проверьте, все ли нужны.";
            case "SUBSCRIPTION_PRICE_INCREASE" -> "Стоимость подписки выросла. Проверьте тариф.";
            case "LARGE_TRANSACTION" -> "Проверьте крупную операцию на "
                + parameters.getOrDefault("amount", "0") + ".";
            case "UNUSUAL_TRANSACTION" -> "Операция отличается от обычных расходов.";
            case "CATEGORY_SPIKE" -> "Расходы в категории заметно выше обычного.";
            case "RECURRING_TRANSACTION_DETECTED" -> "FinApp заметил новую повторяющуюся трату.";
            default -> "FinApp обнаружил новое событие по вашим финансам.";
        };
    }

    private Map<String, Object> data(String severity, String primaryAction, String secondaryAction, Object... entries) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("severity", severity);
        result.put("primaryAction", primaryAction);
        result.put("secondaryAction", secondaryAction);
        for (int i = 0; i + 1 < entries.length; i += 2) {
            if (entries[i] instanceof String key && entries[i + 1] != null) {
                result.put(key, entries[i + 1]);
            }
        }
        return result;
    }

    private BigDecimal decimal(Double value) {
        return value == null ? BigDecimal.ZERO : BigDecimal.valueOf(value);
    }

    private BigDecimal percent(BigDecimal current, BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return nullToZero(current).multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP);
    }

    private String money(BigDecimal value, String currency) {
        return moneyValue(value).toPlainString() + " " + safeCurrency(currency);
    }

    private BigDecimal moneyValue(BigDecimal value) {
        return nullToZero(value).setScale(2, RoundingMode.HALF_UP).stripTrailingZeros();
    }

    private String percentText(BigDecimal value) {
        return moneyValue(value).toPlainString() + "%";
    }

    private String safeCurrency(String currency) {
        return currency == null || currency.isBlank() ? "RUB" : currency;
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String suffixDaysAndDaily(Long daysLeft, BigDecimal safeDailyAmount, String currency) {
        if (daysLeft == null || safeDailyAmount == null) {
            return "";
        }
        return " на " + daysText(daysLeft) + ". Безопасно тратить до " + money(safeDailyAmount, currency) + " в день";
    }

    private String daysText(Long days) {
        if (days == null) {
            return "несколько дней";
        }
        long safeDays = Math.max(days, 0);
        if (safeDays == 1) {
            return "1 день";
        }
        if (safeDays >= 2 && safeDays <= 4) {
            return safeDays + " дня";
        }
        return safeDays + " дней";
    }

    private UUID firstId(List<UUID> ids) {
        return ids == null || ids.isEmpty() ? null : ids.get(0);
    }
}
