package com.finapp.analysis.model;

import com.finapp.analysis.dto.AnomalyInsight;
import com.finapp.analysis.dto.CashflowPoint;
import com.finapp.analysis.dto.CategoryInsight;
import com.finapp.analysis.dto.MerchantInsight;
import com.finapp.analysis.dto.SpendingSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TransactionAnalyticsModel {

    private static final BigDecimal LARGE_TRANSACTION_MULTIPLIER = BigDecimal.valueOf(3);
    private static final BigDecimal CATEGORY_SPIKE_MULTIPLIER = new BigDecimal("1.5");

    private final JdbcTemplate jdbcTemplate;

    public SpendingSummary analyzeSpending(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime toExclusive = periodEnd.plusDays(1).atStartOfDay();

        BigDecimal income = queryAmount(userId, from, toExclusive, "INCOME");
        BigDecimal expenses = queryAmount(userId, from, toExclusive, "EXPENSE");
        BigDecimal recurring = queryRecurringExpenses(userId, from, toExclusive);
        Long transactions = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ?
                """,
            Long.class,
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive)
        );
        BigDecimal qualityScore = queryDataQualityScore(userId, from, toExclusive);
        long days = Math.max(1, ChronoUnit.DAYS.between(periodStart, periodEnd) + 1);

        return new SpendingSummary(
            periodStart,
            periodEnd,
            AnalysisMath.money(income),
            AnalysisMath.money(expenses),
            AnalysisMath.money(income.subtract(expenses)),
            AnalysisMath.percent(income.subtract(expenses), income),
            AnalysisMath.money(expenses.divide(BigDecimal.valueOf(days), 2, RoundingMode.HALF_UP)),
            transactions == null ? 0 : transactions,
            AnalysisMath.money(recurring),
            qualityScore
        );
    }

    public List<CashflowPoint> analyzeDailyCashflow(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime toExclusive = periodEnd.plusDays(1).atStartOfDay();

        return jdbcTemplate.query(
            """
                SELECT CAST(date AS DATE) AS cashflow_date,
                       COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
                       COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expenses
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ?
                GROUP BY CAST(date AS DATE)
                ORDER BY cashflow_date
                """,
            (rs, rowNum) -> {
                BigDecimal income = AnalysisMath.money(rs.getBigDecimal("income"));
                BigDecimal expenses = AnalysisMath.money(rs.getBigDecimal("expenses"));
                return new CashflowPoint(
                    rs.getObject("cashflow_date", LocalDate.class),
                    income,
                    expenses,
                    AnalysisMath.money(income.subtract(expenses))
                );
            },
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive)
        );
    }

    public List<CategoryInsight> analyzeCategories(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime toExclusive = periodEnd.plusDays(1).atStartOfDay();
        BigDecimal totalExpenses = queryAmount(userId, from, toExclusive, "EXPENSE");

        return jdbcTemplate.query(
            """
                SELECT COALESCE(t.category_id, t.ml_category_id) AS effective_category_id,
                       COALESCE(c.name, 'Без категории') AS category_name,
                       t.type,
                       COALESCE(SUM(t.amount), 0) AS amount,
                       COUNT(*) AS tx_count
                FROM transactions t
                LEFT JOIN categories c ON c.id = COALESCE(t.category_id, t.ml_category_id)
                WHERE t.user_id = ? AND t.date >= ? AND t.date < ? AND t.type = 'EXPENSE'
                GROUP BY COALESCE(t.category_id, t.ml_category_id), c.name, t.type
                ORDER BY amount DESC
                LIMIT 10
                """,
            (rs, rowNum) -> new CategoryInsight(
                rs.getObject("effective_category_id", UUID.class),
                rs.getString("category_name"),
                rs.getString("type"),
                AnalysisMath.money(rs.getBigDecimal("amount")),
                AnalysisMath.percent(rs.getBigDecimal("amount"), totalExpenses),
                rs.getLong("tx_count")
            ),
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive)
        );
    }

    public List<MerchantInsight> analyzeMerchants(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime toExclusive = periodEnd.plusDays(1).atStartOfDay();
        BigDecimal totalExpenses = queryAmount(userId, from, toExclusive, "EXPENSE");

        return jdbcTemplate.query(
            """
                SELECT COALESCE(NULLIF(TRIM(location), ''), NULLIF(TRIM(payment_method), ''), 'Неизвестный получатель') AS merchant_name,
                       COALESCE(SUM(amount), 0) AS amount,
                       COUNT(*) AS tx_count,
                       COALESCE(AVG(amount), 0) AS avg_amount
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ? AND type = 'EXPENSE'
                GROUP BY COALESCE(NULLIF(TRIM(location), ''), NULLIF(TRIM(payment_method), ''), 'Неизвестный получатель')
                ORDER BY amount DESC
                LIMIT 10
                """,
            (rs, rowNum) -> new MerchantInsight(
                rs.getString("merchant_name"),
                AnalysisMath.money(rs.getBigDecimal("amount")),
                AnalysisMath.percent(rs.getBigDecimal("amount"), totalExpenses),
                rs.getLong("tx_count"),
                AnalysisMath.money(rs.getBigDecimal("avg_amount"))
            ),
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive)
        );
    }

    public List<AnomalyInsight> detectAnomalies(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        List<AnomalyInsight> anomalies = new ArrayList<>();
        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime toExclusive = periodEnd.plusDays(1).atStartOfDay();
        long days = Math.max(1, ChronoUnit.DAYS.between(periodStart, periodEnd) + 1);
        LocalDateTime previousFrom = periodStart.minusDays(days).atStartOfDay();

        anomalies.addAll(detectLargeTransactions(userId, from, toExclusive));
        anomalies.addAll(detectCategorySpikes(userId, previousFrom, from, toExclusive));
        return anomalies.stream().limit(10).toList();
    }

    private List<AnomalyInsight> detectLargeTransactions(UUID userId, LocalDateTime from, LocalDateTime toExclusive) {
        BigDecimal averageExpense = jdbcTemplate.queryForObject(
            """
                SELECT COALESCE(AVG(amount), 0)
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ? AND type = 'EXPENSE'
                """,
            BigDecimal.class,
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive)
        );
        BigDecimal threshold = AnalysisMath.money(averageExpense).multiply(LARGE_TRANSACTION_MULTIPLIER);
        if (threshold.compareTo(BigDecimal.ZERO) == 0) {
            return List.of();
        }

        return jdbcTemplate.query(
            """
                SELECT id, COALESCE(category_id, ml_category_id) AS category_id, amount, date
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ? AND type = 'EXPENSE' AND amount >= ?
                ORDER BY amount DESC
                LIMIT 5
                """,
            (rs, rowNum) -> new AnomalyInsight(
                "LARGE_TRANSACTION",
                rs.getBigDecimal("amount").compareTo(threshold.multiply(BigDecimal.valueOf(2))) >= 0 ? "HIGH" : "MEDIUM",
                "Крупная транзакция",
                "Расход выше обычного уровня пользователя: " + AnalysisMath.money(rs.getBigDecimal("amount")) + ".",
                rs.getObject("id", UUID.class),
                rs.getObject("category_id", UUID.class),
                AnalysisMath.money(rs.getBigDecimal("amount")),
                AnalysisMath.money(averageExpense),
                toOffsetDateTime(rs.getTimestamp("date"))
            ),
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive),
            threshold
        );
    }

    private List<AnomalyInsight> detectCategorySpikes(
            UUID userId,
            LocalDateTime previousFrom,
            LocalDateTime currentFrom,
            LocalDateTime currentToExclusive) {
        return jdbcTemplate.query(
            """
                WITH current_period AS (
                    SELECT COALESCE(category_id, ml_category_id) AS category_id, COALESCE(SUM(amount), 0) AS amount
                    FROM transactions
                    WHERE user_id = ? AND date >= ? AND date < ? AND type = 'EXPENSE'
                    GROUP BY COALESCE(category_id, ml_category_id)
                ), previous_period AS (
                    SELECT COALESCE(category_id, ml_category_id) AS category_id, COALESCE(SUM(amount), 0) AS amount
                    FROM transactions
                    WHERE user_id = ? AND date >= ? AND date < ? AND type = 'EXPENSE'
                    GROUP BY COALESCE(category_id, ml_category_id)
                )
                SELECT cp.category_id, COALESCE(c.name, 'Без категории') AS category_name,
                       cp.amount AS current_amount, COALESCE(pp.amount, 0) AS previous_amount
                FROM current_period cp
                LEFT JOIN previous_period pp ON (pp.category_id = cp.category_id OR (pp.category_id IS NULL AND cp.category_id IS NULL))
                LEFT JOIN categories c ON c.id = cp.category_id
                WHERE COALESCE(pp.amount, 0) > 0 AND cp.amount >= pp.amount * ?
                ORDER BY cp.amount DESC
                LIMIT 5
                """,
            (rs, rowNum) -> new AnomalyInsight(
                "CATEGORY_SPIKE",
                rs.getBigDecimal("current_amount").compareTo(rs.getBigDecimal("previous_amount").multiply(BigDecimal.valueOf(2))) >= 0 ? "HIGH" : "MEDIUM",
                "Рост расходов в категории",
                "Категория «" + rs.getString("category_name") + "» выросла относительно прошлого периода.",
                null,
                rs.getObject("category_id", UUID.class),
                AnalysisMath.money(rs.getBigDecimal("current_amount")),
                AnalysisMath.money(rs.getBigDecimal("previous_amount")),
                OffsetDateTime.now(ZoneOffset.UTC)
            ),
            userId,
            Timestamp.valueOf(currentFrom),
            Timestamp.valueOf(currentToExclusive),
            userId,
            Timestamp.valueOf(previousFrom),
            Timestamp.valueOf(currentFrom),
            CATEGORY_SPIKE_MULTIPLIER
        );
    }

    private BigDecimal queryAmount(UUID userId, LocalDateTime from, LocalDateTime toExclusive, String type) {
        BigDecimal value = jdbcTemplate.queryForObject(
            """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ? AND type = ?
                """,
            BigDecimal.class,
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive),
            type
        );
        return AnalysisMath.nullToZero(value);
    }

    private BigDecimal queryRecurringExpenses(UUID userId, LocalDateTime from, LocalDateTime toExclusive) {
        BigDecimal value = jdbcTemplate.queryForObject(
            """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ? AND type = 'EXPENSE' AND is_recurring = TRUE
                """,
            BigDecimal.class,
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive)
        );
        return AnalysisMath.nullToZero(value);
    }

    private BigDecimal queryDataQualityScore(UUID userId, LocalDateTime from, LocalDateTime toExclusive) {
        BigDecimal value = jdbcTemplate.queryForObject(
            """
                SELECT COALESCE(AVG(
                    CASE
                        WHEN is_verified = TRUE THEN 100
                        WHEN ml_confidence IS NOT NULL THEN ml_confidence * 100
                        ELSE 50
                    END
                ), 100)
                FROM transactions
                WHERE user_id = ? AND date >= ? AND date < ?
                """,
            BigDecimal.class,
            userId,
            Timestamp.valueOf(from),
            Timestamp.valueOf(toExclusive)
        );
        return AnalysisMath.money(value);
    }

    private OffsetDateTime toOffsetDateTime(Timestamp timestamp) {
        if (timestamp == null) {
            return null;
        }
        return timestamp.toInstant().atOffset(ZoneOffset.UTC);
    }
}
