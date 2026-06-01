package com.finapp.services.shared;

import com.finapp.models.budget.Budget;
import com.finapp.models.goal.Goal;
import com.finapp.models.shared.Notification;
import com.finapp.repositories.budget.BudgetRepository;
import com.finapp.repositories.goal.GoalRepository;
import com.finapp.repositories.shared.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialNotificationService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final int[] BUDGET_THRESHOLDS = {100, 95, 85, 70};

    private final BudgetRepository budgetRepository;
    private final GoalRepository goalRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public Map<String, Object> generateSmartNotifications(UUID userId) {
        List<Notification> created = new ArrayList<>();
        appendSafely(created, "budget", () -> generateBudgetNotifications(userId));
        appendSafely(created, "goals", () -> generateGoalNotifications(userId));
        appendSafely(created, "operations", () -> generateOperationNotifications(userId));
        appendSafely(created, "subscriptions", () -> generateSubscriptionNotifications(userId));

        return Map.of(
            "created", created.size(),
            "budget", created.stream().filter(n -> "budget".equals(n.getEntityType())).count(),
            "goal", created.stream().filter(n -> "goal".equals(n.getEntityType())).count(),
            "transaction", created.stream().filter(n -> "transaction".equals(n.getEntityType()) || "category".equals(n.getEntityType())).count(),
            "subscription", created.stream().filter(n -> "subscription".equals(n.getEntityType())).count(),
            "notifications", created
        );
    }

    private void appendSafely(List<Notification> target, String block, Supplier<List<Notification>> supplier) {
        try {
            target.addAll(supplier.get());
        } catch (Exception e) {
            log.warn("Smart notification block {} failed: {}", block, e.getMessage());
        }
    }

    public List<Notification> generateBudgetNotifications(UUID userId) {
        LocalDate today = LocalDate.now();
        List<Notification> created = new ArrayList<>();
        for (Budget budget : budgetRepository.findActiveBudgetsByDate(userId, today)) {
            BudgetMetrics metrics = budgetMetrics(budget, today);
            if (metrics.limit().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            for (int threshold : BUDGET_THRESHOLDS) {
                if (metrics.progress().compareTo(BigDecimal.valueOf(threshold)) >= 0) {
                    created.addAll(createBudgetThresholdNotification(budget, metrics, threshold));
                    break;
                }
            }

            if (metrics.progress().compareTo(BigDecimal.valueOf(100)) < 0
                && metrics.elapsedPercent().compareTo(BigDecimal.ZERO) > 0
                && metrics.progress().subtract(metrics.elapsedPercent()).compareTo(BigDecimal.valueOf(25)) >= 0) {
                created.addAll(createBudgetForecastNotification(budget, metrics));
            }

            if ((metrics.progress().compareTo(BigDecimal.valueOf(70)) >= 0 || metrics.daysLeft() <= 3)
                && metrics.remaining().compareTo(BigDecimal.ZERO) > 0) {
                created.addAll(createSafeDailyLimitNotification(budget, metrics));
            }

            if (metrics.daysLeft() <= 3) {
                created.addAll(createBudgetPeriodEndNotification(budget, metrics));
            }
        }
        return created;
    }

    public List<Notification> generateGoalNotifications(UUID userId) {
        LocalDate today = LocalDate.now();
        List<Notification> created = new ArrayList<>();
        for (Goal goal : goalRepository.findByUserIdAndStatus(userId, "ACTIVE")) {
            GoalMetrics metrics = goalMetrics(goal, today);
            if (metrics.target().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            if (metrics.remaining().compareTo(BigDecimal.ZERO) <= 0) {
                created.addAll(createGoalCompletedNotification(goal, metrics));
                continue;
            }

            if (metrics.progress().compareTo(BigDecimal.valueOf(90)) >= 0) {
                created.addAll(createGoalAlmostDoneNotification(goal, metrics));
            }

            if (metrics.daysLeft() > 0) {
                created.addAll(createGoalContributionDueNotification(goal, metrics));
            }

            if (metrics.expectedProgress().subtract(metrics.progress()).compareTo(BigDecimal.valueOf(10)) >= 0) {
                created.addAll(createGoalBehindScheduleNotification(goal, metrics));
            }

            if (metrics.daysLeft() <= 14 && metrics.remaining().compareTo(BigDecimal.ZERO) > 0) {
                created.addAll(createGoalDeadlineRiskNotification(goal, metrics));
            }
        }

        for (Goal goal : goalRepository.findByUserIdAndStatus(userId, "COMPLETED")) {
            created.addAll(createGoalCompletedNotification(goal, goalMetrics(goal, today)));
        }
        return created;
    }

    public List<Notification> generateOperationNotifications(UUID userId) {
        List<Notification> created = new ArrayList<>();
        created.addAll(generateLargeAndUnusualTransactionNotifications(userId));
        created.addAll(generateCategorySpikeNotifications(userId));
        created.addAll(generateNewRecurringTransactionNotifications(userId));
        return created;
    }

    public List<Notification> generateSubscriptionNotifications(UUID userId) {
        List<Notification> created = new ArrayList<>();
        created.addAll(generateSubscriptionRenewalNotifications(userId));
        created.addAll(generateUnusedSubscriptionNotifications(userId));
        created.addAll(generateDuplicateSubscriptionNotifications(userId));
        created.addAll(generateSubscriptionPriceIncreaseNotifications(userId));
        return created;
    }

    private List<Notification> createBudgetThresholdNotification(Budget budget, BudgetMetrics metrics, int threshold) {
        String type = threshold >= 100 ? "BUDGET_EXCEEDED" : "BUDGET_THRESHOLD_" + threshold;
        String title = threshold >= 100
            ? "Бюджет превышен: " + metrics.name()
            : "Бюджет “" + metrics.name() + "” на " + threshold + "%";
        String message = threshold >= 100
            ? "Лимит превышен на " + money(metrics.spent().subtract(metrics.limit()), metrics.currency()) + ". Проверьте последние операции."
            : "Осталось " + money(metrics.remaining(), metrics.currency()) + " на " + metrics.daysLeft() + " дн. Безопасно тратить до " + money(metrics.safeDailyAmount(), metrics.currency()) + " в день.";
        Map<String, Object> data = data(
            "block", "budget_control",
            "severity", threshold >= 100 ? "critical" : threshold >= 95 ? "warning" : "info",
            "threshold", threshold,
            "spent", metrics.spent(),
            "limit", metrics.limit(),
            "remaining", metrics.remaining(),
            "daysLeft", metrics.daysLeft(),
            "safeDailyAmount", metrics.safeDailyAmount(),
            "primaryAction", "OPEN_BUDGET"
        );
        return maybeCreate(budget.getUserId(), type, title, message, "budget", budget.getId(), data, Duration.ofDays(7));
    }

    private List<Notification> createBudgetForecastNotification(Budget budget, BudgetMetrics metrics) {
        String title = "Темп расходов выше плана";
        String message = "В бюджете “" + metrics.name() + "” потрачено " + percent(metrics.progress())
            + ", хотя прошло " + percent(metrics.elapsedPercent()) + " периода. Лимит может закончиться раньше.";
        return maybeCreate(budget.getUserId(), "BUDGET_FORECAST_RISK", title, message, "budget", budget.getId(), data(
            "block", "budget_control",
            "severity", "warning",
            "progress", metrics.progress(),
            "elapsedPercent", metrics.elapsedPercent(),
            "primaryAction", "SHOW_FORECAST"
        ), Duration.ofDays(3));
    }

    private List<Notification> createSafeDailyLimitNotification(Budget budget, BudgetMetrics metrics) {
        String title = "Безопасный дневной лимит";
        String message = "По бюджету “" + metrics.name() + "” можно тратить до "
            + money(metrics.safeDailyAmount(), metrics.currency()) + " в день, чтобы уложиться в период.";
        return maybeCreate(budget.getUserId(), "DAILY_SAFE_LIMIT", title, message, "budget", budget.getId(), data(
            "block", "budget_control",
            "severity", "info",
            "safeDailyAmount", metrics.safeDailyAmount(),
            "daysLeft", metrics.daysLeft(),
            "primaryAction", "OPEN_BUDGET"
        ), Duration.ofDays(1));
    }

    private List<Notification> createBudgetPeriodEndNotification(Budget budget, BudgetMetrics metrics) {
        String title = "До конца бюджета " + metrics.daysLeft() + " дн.";
        String message = "В “" + metrics.name() + "” осталось " + money(metrics.remaining(), metrics.currency())
            + ". План на день: " + money(metrics.safeDailyAmount(), metrics.currency()) + ".";
        return maybeCreate(budget.getUserId(), "BUDGET_PERIOD_END", title, message, "budget", budget.getId(), data(
            "block", "budget_control",
            "severity", metrics.remaining().compareTo(BigDecimal.ZERO) > 0 ? "info" : "warning",
            "daysLeft", metrics.daysLeft(),
            "remaining", metrics.remaining(),
            "primaryAction", "OPEN_BUDGET"
        ), Duration.ofDays(1));
    }

    private List<Notification> createGoalContributionDueNotification(Goal goal, GoalMetrics metrics) {
        String title = "Пора пополнить цель “" + goal.getName() + "”";
        String message = "Чтобы успеть к сроку, внесите " + money(metrics.weeklyRequired(), goal.getCurrency()) + " за неделю.";
        return maybeCreate(goal.getUserId(), "GOAL_CONTRIBUTION_DUE", title, message, "goal", goal.getId(), data(
            "block", "goals",
            "severity", "info",
            "weeklyRequired", metrics.weeklyRequired(),
            "remaining", metrics.remaining(),
            "daysLeft", metrics.daysLeft(),
            "primaryAction", "OPEN_GOAL"
        ), Duration.ofDays(7));
    }

    private List<Notification> createGoalBehindScheduleNotification(Goal goal, GoalMetrics metrics) {
        String title = "Цель “" + goal.getName() + "” отстаёт";
        String message = "Сейчас накоплено " + percent(metrics.progress()) + ", а по плану нужно около "
            + percent(metrics.expectedProgress()) + ". Внесите " + money(metrics.weeklyRequired(), goal.getCurrency()) + " за неделю.";
        return maybeCreate(goal.getUserId(), "GOAL_BEHIND_SCHEDULE", title, message, "goal", goal.getId(), data(
            "block", "goals",
            "severity", "warning",
            "progress", metrics.progress(),
            "expectedProgress", metrics.expectedProgress(),
            "primaryAction", "OPEN_GOAL"
        ), Duration.ofDays(3));
    }

    private List<Notification> createGoalDeadlineRiskNotification(Goal goal, GoalMetrics metrics) {
        String title = "Риск не успеть по цели";
        String message = "До “" + goal.getName() + "” осталось " + metrics.daysLeft() + " дн. Нужно внести "
            + money(metrics.remaining(), goal.getCurrency()) + ".";
        return maybeCreate(goal.getUserId(), "GOAL_DEADLINE_RISK", title, message, "goal", goal.getId(), data(
            "block", "goals",
            "severity", "critical",
            "remaining", metrics.remaining(),
            "daysLeft", metrics.daysLeft(),
            "primaryAction", "OPEN_GOAL"
        ), Duration.ofDays(1));
    }

    private List<Notification> createGoalAlmostDoneNotification(Goal goal, GoalMetrics metrics) {
        String title = "До цели осталось немного";
        String message = "До “" + goal.getName() + "” осталось " + money(metrics.remaining(), goal.getCurrency()) + ". Можно закрыть досрочно.";
        return maybeCreate(goal.getUserId(), "GOAL_ALMOST_DONE", title, message, "goal", goal.getId(), data(
            "block", "goals",
            "severity", "positive",
            "remaining", metrics.remaining(),
            "progress", metrics.progress(),
            "primaryAction", "OPEN_GOAL"
        ), Duration.ofDays(7));
    }

    private List<Notification> createGoalCompletedNotification(Goal goal, GoalMetrics metrics) {
        String title = "Цель достигнута: " + goal.getName();
        String message = "Накоплено " + money(metrics.current(), goal.getCurrency()) + ". Отличный результат — можно выбрать следующую цель.";
        return maybeCreate(goal.getUserId(), "GOAL_COMPLETED", title, message, "goal", goal.getId(), data(
            "block", "goals",
            "severity", "positive",
            "progress", metrics.progress(),
            "primaryAction", "OPEN_GOAL"
        ), Duration.ofDays(30));
    }

    private List<Notification> generateLargeAndUnusualTransactionNotifications(UUID userId) {
        List<TransactionRow> rows = recentTransactions(userId, 2);
        List<Notification> created = new ArrayList<>();
        for (TransactionRow tx : rows) {
            BigDecimal average = averageCategoryAmount(userId, tx.categoryId());
            BigDecimal largeFloor = BigDecimal.valueOf(5_000);
            BigDecimal unusualFloor = BigDecimal.valueOf(1_000);
            if (tx.amount().compareTo(largeFloor) >= 0 || (average.compareTo(BigDecimal.ZERO) > 0 && tx.amount().compareTo(average.multiply(BigDecimal.valueOf(3))) >= 0)) {
                created.addAll(maybeCreate(userId, "LARGE_TRANSACTION", "Крупная трата: " + money(tx.amount(), tx.currency()),
                    "Операция “" + tx.label() + "” выше обычного. Проверьте категорию и влияние на бюджет.",
                    "transaction", tx.id(), data(
                        "block", "operations",
                        "severity", "warning",
                        "amount", tx.amount(),
                        "categoryName", tx.categoryName(),
                        "primaryAction", "OPEN_TRANSACTION"
                    ), Duration.ofDays(7)));
            }
            if (tx.amount().compareTo(unusualFloor) >= 0 && isNewMerchantOrCategory(userId, tx)) {
                created.addAll(maybeCreate(userId, "UNUSUAL_TRANSACTION", "Нетипичная трата",
                    "“" + tx.label() + "” на " + money(tx.amount(), tx.currency()) + " не похожа на ваши обычные расходы.",
                    "transaction", tx.id(), data(
                        "block", "operations",
                        "severity", "warning",
                        "amount", tx.amount(),
                        "primaryAction", "VERIFY_TRANSACTION"
                    ), Duration.ofDays(7)));
            }
        }
        return created;
    }

    private List<Notification> generateCategorySpikeNotifications(UUID userId) {
        List<CategorySpike> spikes = jdbcTemplate.query(
            """
            WITH weekly AS (
                SELECT COALESCE(category_id, ml_category_id) AS category_id,
                       SUM(CASE WHEN date >= ? THEN amount ELSE 0 END) AS current_sum,
                       SUM(CASE WHEN date < ? AND date >= ? THEN amount ELSE 0 END) / 4 AS average_sum
                FROM transactions
                WHERE user_id = ? AND UPPER(type) = 'EXPENSE' AND date >= ?
                GROUP BY COALESCE(category_id, ml_category_id)
            )
            SELECT w.category_id, COALESCE(c.name, 'Категория'), w.current_sum, w.average_sum
            FROM weekly w
            LEFT JOIN categories c ON c.id = w.category_id
            WHERE w.current_sum >= 1000 AND w.average_sum > 0 AND w.current_sum >= w.average_sum * 1.5
            """,
            (rs, rowNum) -> new CategorySpike(
                rs.getObject("category_id", UUID.class),
                rs.getString(2),
                rs.getBigDecimal("current_sum"),
                rs.getBigDecimal("average_sum")
            ),
            Timestamp.from(OffsetDateTime.now().minusDays(7).toInstant()),
            Timestamp.from(OffsetDateTime.now().minusDays(7).toInstant()),
            Timestamp.from(OffsetDateTime.now().minusDays(35).toInstant()),
            userId,
            Timestamp.from(OffsetDateTime.now().minusDays(35).toInstant())
        );

        List<Notification> created = new ArrayList<>();
        for (CategorySpike spike : spikes) {
            BigDecimal delta = spike.currentSum().subtract(spike.averageSum()).max(BigDecimal.ZERO);
            created.addAll(maybeCreate(userId, "CATEGORY_SPIKE", "Расходы выросли: " + spike.categoryName(),
                "За 7 дней категория выше обычного на " + money(delta, "RUB") + ". Это может повлиять на бюджет месяца.",
                "category", spike.categoryId(), data(
                    "block", "operations",
                    "severity", "info",
                    "currentSum", spike.currentSum(),
                    "averageSum", spike.averageSum(),
                    "primaryAction", "SHOW_CATEGORY_TRANSACTIONS"
                ), Duration.ofDays(7)));
        }
        return created;
    }

    private List<Notification> generateNewRecurringTransactionNotifications(UUID userId) {
        List<TransactionRow> rows = jdbcTemplate.query(
            """
            SELECT t.id, t.amount, t.currency, COALESCE(t.category_id, t.ml_category_id) AS category_id,
                   COALESCE(c.name, 'Категория') AS category_name,
                   COALESCE(NULLIF(t.description, ''), NULLIF(t.original_description, ''), 'Операция') AS label,
                   t.date
            FROM transactions t
            LEFT JOIN categories c ON c.id = COALESCE(t.category_id, t.ml_category_id)
            WHERE t.user_id = ? AND UPPER(t.type) = 'EXPENSE' AND t.is_recurring = true AND t.updated_at >= ?
            ORDER BY t.updated_at DESC
            LIMIT 10
            """,
            this::mapTransaction,
            userId,
            Timestamp.from(OffsetDateTime.now().minusDays(7).toInstant())
        );
        List<Notification> created = new ArrayList<>();
        for (TransactionRow tx : rows) {
            created.addAll(maybeCreate(userId, "NEW_RECURRING_TRANSACTION", "Новая регулярная трата",
                "Мы заметили повторяющуюся операцию “" + tx.label() + "” на " + money(tx.amount(), tx.currency()) + ". Проверьте, нужна ли она.",
                "transaction", tx.id(), data(
                    "block", "operations",
                    "severity", "info",
                    "amount", tx.amount(),
                    "primaryAction", "OPEN_TRANSACTION"
                ), Duration.ofDays(14)));
        }
        return created;
    }

    private List<Notification> generateSubscriptionRenewalNotifications(UUID userId) {
        List<SubscriptionRow> rows = jdbcTemplate.query(
            """
            SELECT id, name, amount, currency, recurrence, COALESCE(usage_index, 0.5) AS usage_index,
                   COALESCE(budget_impact, 0) AS budget_impact, recommendation_type, next_billing_date
            FROM subscriptions
            WHERE user_id = ? AND is_active = true AND next_billing_date BETWEEN ? AND ?
            """,
            this::mapSubscription,
            userId,
            Date.valueOf(LocalDate.now()),
            Date.valueOf(LocalDate.now().plusDays(3))
        );
        List<Notification> created = new ArrayList<>();
        for (SubscriptionRow sub : rows) {
            String message = sub.name() + " спишется скоро: " + money(sub.amount(), sub.currency()) + ".";
            if (sub.usageIndex().compareTo(BigDecimal.valueOf(0.42)) < 0) {
                message += " Использование выглядит редким — проверьте перед списанием.";
            }
            created.addAll(maybeCreate(userId, "SUBSCRIPTION_RENEWAL", "Скоро спишется " + sub.name(), message,
                "subscription", sub.id(), data(
                    "block", "subscriptions",
                    "severity", sub.usageIndex().compareTo(BigDecimal.valueOf(0.42)) < 0 ? "warning" : "info",
                    "amount", sub.amount(),
                    "nextBillingDate", sub.nextBillingDate(),
                    "primaryAction", "OPEN_SUBSCRIPTION"
                ), Duration.ofDays(3)));
        }
        return created;
    }

    private List<Notification> generateUnusedSubscriptionNotifications(UUID userId) {
        List<SubscriptionRow> rows = jdbcTemplate.query(
            """
            SELECT id, name, amount, currency, recurrence, COALESCE(usage_index, 0.5) AS usage_index,
                   COALESCE(budget_impact, 0) AS budget_impact, recommendation_type, next_billing_date
            FROM subscriptions
            WHERE user_id = ? AND is_active = true
              AND (COALESCE(usage_index, 0.5) < 0.42 OR recommendation_type IN ('ask_feedback', 'cancel_or_pause'))
            ORDER BY amount DESC
            LIMIT 5
            """,
            this::mapSubscription,
            userId
        );
        List<Notification> created = new ArrayList<>();
        for (SubscriptionRow sub : rows) {
            created.addAll(maybeCreate(userId, "SUBSCRIPTION_UNUSED", "Проверить подписку: " + sub.name(),
                sub.name() + " стоит " + money(sub.amount(), sub.currency()) + ". Ответьте на один вопрос, чтобы не советовать лишнюю отмену.",
                "subscription", sub.id(), data(
                    "block", "subscriptions",
                    "severity", "warning",
                    "usageIndex", sub.usageIndex(),
                    "budgetImpact", sub.budgetImpact(),
                    "primaryAction", "OPEN_SUBSCRIPTION_FEEDBACK"
                ), Duration.ofDays(7)));
        }
        return created;
    }

    private List<Notification> generateDuplicateSubscriptionNotifications(UUID userId) {
        List<SubscriptionGroup> groups = jdbcTemplate.query(
            """
            SELECT service_group, COUNT(*) AS service_count, SUM(amount) AS total_amount
            FROM (
                SELECT CASE
                    WHEN lower(name) ~ '(кинопоиск|ivi|okko|wink|start|premier|amediateka|netflix|youtube)' THEN 'видеосервисы'
                    WHEN lower(name) ~ '(spotify|vk music|boom|music|музык)' THEN 'музыка'
                    WHEN lower(name) ~ '(google one|icloud|cloud|облако)' THEN 'облако'
                    WHEN lower(name) ~ '(fitness|gym|фитнес|спорт)' THEN 'спорт'
                    ELSE NULL
                END AS service_group, amount
                FROM subscriptions
                WHERE user_id = ? AND is_active = true
            ) grouped
            WHERE service_group IS NOT NULL
            GROUP BY service_group
            HAVING COUNT(*) >= 2
            """,
            (rs, rowNum) -> new SubscriptionGroup(rs.getString("service_group"), rs.getInt("service_count"), rs.getBigDecimal("total_amount")),
            userId
        );
        List<Notification> created = new ArrayList<>();
        for (SubscriptionGroup group : groups) {
            created.addAll(maybeCreate(userId, "SUBSCRIPTION_DUPLICATE", "Похожие подписки",
                "У вас " + group.count() + " подписки в группе “" + group.groupName() + "” на " + money(group.totalAmount(), "RUB") + "/мес. Проверьте, все ли нужны.",
                "subscription", deterministicId("subscription_duplicate:" + group.groupName()), data(
                    "block", "subscriptions",
                    "severity", "info",
                    "group", group.groupName(),
                    "count", group.count(),
                    "totalAmount", group.totalAmount(),
                    "primaryAction", "OPEN_SUBSCRIPTIONS"
                ), Duration.ofDays(14)));
        }
        return created;
    }

    private List<Notification> generateSubscriptionPriceIncreaseNotifications(UUID userId) {
        List<PriceIncrease> rows = jdbcTemplate.query(
            """
            WITH recurring AS (
                SELECT trim(lower(regexp_replace(COALESCE(description, original_description, ''), '[0-9.,#/*()_-]+', ' ', 'g'))) AS normalized_name,
                       amount, currency, date
                FROM transactions
                WHERE user_id = ? AND UPPER(type) = 'EXPENSE' AND date >= ?
            ), ranked AS (
                SELECT normalized_name, amount, currency, date,
                       row_number() OVER (PARTITION BY normalized_name ORDER BY date DESC) AS rn
                FROM recurring
                WHERE length(normalized_name) > 3
            )
            SELECT latest.normalized_name, latest.amount AS latest_amount, previous.amount AS previous_amount, latest.currency
            FROM ranked latest
            JOIN ranked previous ON previous.normalized_name = latest.normalized_name AND previous.rn = 2
            WHERE latest.rn = 1 AND latest.amount >= previous.amount * 1.15 AND latest.amount - previous.amount >= 50
            LIMIT 5
            """,
            (rs, rowNum) -> new PriceIncrease(rs.getString("normalized_name"), rs.getBigDecimal("latest_amount"), rs.getBigDecimal("previous_amount"), rs.getString("currency")),
            userId,
            Timestamp.from(OffsetDateTime.now().minusMonths(6).toInstant())
        );
        List<Notification> created = new ArrayList<>();
        for (PriceIncrease row : rows) {
            created.addAll(maybeCreate(userId, "SUBSCRIPTION_PRICE_INCREASE", "Подписка подорожала",
                "“" + row.name() + "” выросла с " + money(row.previousAmount(), row.currency()) + " до " + money(row.latestAmount(), row.currency()) + ". Проверьте тариф.",
                "subscription", deterministicId("subscription_price:" + row.name()), data(
                    "block", "subscriptions",
                    "severity", "warning",
                    "previousAmount", row.previousAmount(),
                    "latestAmount", row.latestAmount(),
                    "primaryAction", "OPEN_SUBSCRIPTIONS"
                ), Duration.ofDays(14)));
        }
        return created;
    }

    private List<Notification> maybeCreate(UUID userId, String type, String title, String message, String entityType,
                                           UUID entityId, Map<String, Object> data, Duration dedupeWindow) {
        OffsetDateTime since = OffsetDateTime.now().minus(dedupeWindow);
        if (notificationRepository.countSimilarRecent(userId, type, entityType, entityId, since) > 0) {
            return List.of();
        }
        return List.of(notificationService.createNotification(userId, type, title, message, "JAVA", entityType, entityId, data));
    }

    private BudgetMetrics budgetMetrics(Budget budget, LocalDate today) {
        BigDecimal limit = nullToZero(budget.getAmountLimit());
        BigDecimal spent = calculateSpentAmount(budget);
        BigDecimal remaining = limit.subtract(spent).max(BigDecimal.ZERO);
        long daysLeft = Math.max(1, ChronoUnit.DAYS.between(today, budget.getPeriodEnd()) + 1);
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(budget.getPeriodStart(), budget.getPeriodEnd()) + 1);
        long elapsedDays = Math.min(totalDays, Math.max(1, ChronoUnit.DAYS.between(budget.getPeriodStart(), today) + 1));
        BigDecimal progress = percentOf(spent, limit);
        BigDecimal elapsedPercent = BigDecimal.valueOf(elapsedDays).multiply(ONE_HUNDRED).divide(BigDecimal.valueOf(totalDays), 2, RoundingMode.HALF_UP);
        BigDecimal safeDailyAmount = remaining.divide(BigDecimal.valueOf(daysLeft), 2, RoundingMode.HALF_UP);
        return new BudgetMetrics(
            resolveCategoryName(budget.getCategoryId()),
            limit,
            spent,
            remaining,
            progress,
            elapsedPercent,
            safeDailyAmount,
            daysLeft,
            budget.getCurrency() == null ? "RUB" : budget.getCurrency()
        );
    }

    private GoalMetrics goalMetrics(Goal goal, LocalDate today) {
        BigDecimal target = nullToZero(goal.getTargetAmount());
        BigDecimal current = nullToZero(goal.getCurrentAmount());
        BigDecimal remaining = target.subtract(current).max(BigDecimal.ZERO);
        LocalDate start = goal.getCreatedAt() == null ? today : goal.getCreatedAt().toLocalDate();
        long daysLeft = Math.max(0, ChronoUnit.DAYS.between(today, goal.getDeadline()));
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(start, goal.getDeadline()));
        long elapsedDays = Math.min(totalDays, Math.max(0, ChronoUnit.DAYS.between(start, today)));
        BigDecimal progress = percentOf(current, target);
        BigDecimal expectedProgress = BigDecimal.valueOf(elapsedDays).multiply(ONE_HUNDRED).divide(BigDecimal.valueOf(totalDays), 2, RoundingMode.HALF_UP);
        BigDecimal weeklyRequired = daysLeft <= 0
            ? remaining
            : remaining.multiply(BigDecimal.valueOf(7)).divide(BigDecimal.valueOf(daysLeft), 2, RoundingMode.HALF_UP);
        return new GoalMetrics(target, current, remaining, progress, expectedProgress, weeklyRequired, daysLeft);
    }

    private BigDecimal calculateSpentAmount(Budget budget) {
        BigDecimal value;
        if (budget.getCategoryId() == null) {
            value = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ? AND UPPER(type) = 'EXPENSE' AND date >= ? AND date < ?
                """,
                BigDecimal.class,
                budget.getUserId(),
                Timestamp.from(budget.getPeriodStart().atStartOfDay().toInstant(ZoneOffset.UTC)),
                Timestamp.from(budget.getPeriodEnd().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC))
            );
        } else {
            value = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ? AND UPPER(type) = 'EXPENSE'
                  AND COALESCE(category_id, ml_category_id) = ?
                  AND date >= ? AND date < ?
                """,
                BigDecimal.class,
                budget.getUserId(),
                budget.getCategoryId(),
                Timestamp.from(budget.getPeriodStart().atStartOfDay().toInstant(ZoneOffset.UTC)),
                Timestamp.from(budget.getPeriodEnd().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC))
            );
        }
        return nullToZero(value);
    }

    private String resolveCategoryName(UUID categoryId) {
        if (categoryId == null) {
            return "Общий бюджет";
        }
        List<String> names = jdbcTemplate.queryForList("SELECT name FROM categories WHERE id = ? LIMIT 1", String.class, categoryId);
        return names.isEmpty() ? "Категория" : names.get(0);
    }

    private List<TransactionRow> recentTransactions(UUID userId, int days) {
        return jdbcTemplate.query(
            """
            SELECT t.id, t.amount, t.currency, COALESCE(t.category_id, t.ml_category_id) AS category_id,
                   COALESCE(c.name, 'Категория') AS category_name,
                   COALESCE(NULLIF(t.description, ''), NULLIF(t.original_description, ''), 'Операция') AS label,
                   t.date
            FROM transactions t
            LEFT JOIN categories c ON c.id = COALESCE(t.category_id, t.ml_category_id)
            WHERE t.user_id = ? AND UPPER(t.type) = 'EXPENSE' AND t.date >= ?
            ORDER BY t.date DESC
            LIMIT 20
            """,
            this::mapTransaction,
            userId,
            Timestamp.from(OffsetDateTime.now().minusDays(days).toInstant())
        );
    }

    private TransactionRow mapTransaction(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new TransactionRow(
            rs.getObject("id", UUID.class),
            rs.getBigDecimal("amount"),
            rs.getString("currency"),
            rs.getObject("category_id", UUID.class),
            rs.getString("category_name"),
            rs.getString("label"),
            rs.getTimestamp("date").toInstant().atOffset(ZoneOffset.UTC)
        );
    }

    private SubscriptionRow mapSubscription(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Date billingDate = rs.getDate("next_billing_date");
        return new SubscriptionRow(
            rs.getObject("id", UUID.class),
            rs.getString("name"),
            rs.getBigDecimal("amount"),
            rs.getString("currency"),
            rs.getString("recurrence"),
            rs.getBigDecimal("usage_index"),
            rs.getBigDecimal("budget_impact"),
            rs.getString("recommendation_type"),
            billingDate == null ? null : billingDate.toLocalDate()
        );
    }

    private BigDecimal averageCategoryAmount(UUID userId, UUID categoryId) {
        if (categoryId == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal value = jdbcTemplate.queryForObject(
            """
            SELECT COALESCE(AVG(amount), 0)
            FROM transactions
            WHERE user_id = ? AND UPPER(type) = 'EXPENSE'
              AND COALESCE(category_id, ml_category_id) = ?
              AND date >= ? AND date < ?
            """,
            BigDecimal.class,
            userId,
            categoryId,
            Timestamp.from(OffsetDateTime.now().minusDays(90).toInstant()),
            Timestamp.from(OffsetDateTime.now().minusDays(2).toInstant())
        );
        return nullToZero(value);
    }

    private boolean isNewMerchantOrCategory(UUID userId, TransactionRow tx) {
        Integer count = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM transactions
            WHERE user_id = ? AND UPPER(type) = 'EXPENSE' AND id <> ? AND date < ?
              AND (
                COALESCE(category_id, ml_category_id) = ?
                OR lower(COALESCE(description, original_description, '')) = lower(?)
              )
            """,
            Integer.class,
            userId,
            tx.id(),
            Timestamp.from(tx.date().toInstant()),
            tx.categoryId(),
            tx.label()
        );
        return count == null || count == 0;
    }

    private UUID deterministicId(String value) {
        return UUID.nameUUIDFromBytes(value.getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, Object> data(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i + 1 < values.length; i += 2) {
            result.put(String.valueOf(values[i]), values[i + 1]);
        }
        return result;
    }

    private BigDecimal percentOf(BigDecimal value, BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return nullToZero(value).multiply(ONE_HUNDRED).divide(total, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String percent(BigDecimal value) {
        return nullToZero(value).setScale(0, RoundingMode.HALF_UP).toPlainString() + "%";
    }

    private String money(BigDecimal value, String currency) {
        return nullToZero(value).setScale(0, RoundingMode.HALF_UP).toPlainString() + " " + (currency == null ? "RUB" : currency);
    }

    private record BudgetMetrics(String name, BigDecimal limit, BigDecimal spent, BigDecimal remaining,
                                 BigDecimal progress, BigDecimal elapsedPercent, BigDecimal safeDailyAmount,
                                 long daysLeft, String currency) {}

    private record GoalMetrics(BigDecimal target, BigDecimal current, BigDecimal remaining, BigDecimal progress,
                               BigDecimal expectedProgress, BigDecimal weeklyRequired, long daysLeft) {}

    private record TransactionRow(UUID id, BigDecimal amount, String currency, UUID categoryId, String categoryName,
                                  String label, OffsetDateTime date) {}

    private record CategorySpike(UUID categoryId, String categoryName, BigDecimal currentSum, BigDecimal averageSum) {}

    private record SubscriptionRow(UUID id, String name, BigDecimal amount, String currency, String recurrence,
                                   BigDecimal usageIndex, BigDecimal budgetImpact, String recommendationType,
                                   LocalDate nextBillingDate) {}

    private record SubscriptionGroup(String groupName, int count, BigDecimal totalAmount) {}

    private record PriceIncrease(String name, BigDecimal latestAmount, BigDecimal previousAmount, String currency) {}
}
