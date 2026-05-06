package com.finapp.analysis.model;

import com.finapp.analysis.dto.CategoryInsight;
import com.finapp.analysis.dto.SpendingSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TransactionAnalyticsModel {

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
            AnalysisMath.money(expenses.divide(BigDecimal.valueOf(days), 2, java.math.RoundingMode.HALF_UP)),
            transactions == null ? 0 : transactions,
            AnalysisMath.money(recurring),
            qualityScore
        );
    }

    public List<CategoryInsight> analyzeCategories(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime toExclusive = periodEnd.plusDays(1).atStartOfDay();
        BigDecimal totalExpenses = queryAmount(userId, from, toExclusive, "EXPENSE");

        return jdbcTemplate.query(
            """
                SELECT t.category_id,
                       COALESCE(c.name, 'Без категории') AS category_name,
                       t.type,
                       COALESCE(SUM(t.amount), 0) AS amount,
                       COUNT(*) AS tx_count
                FROM transactions t
                LEFT JOIN categories c ON c.id = t.category_id
                WHERE t.user_id = ? AND t.date >= ? AND t.date < ? AND t.type = 'EXPENSE'
                GROUP BY t.category_id, c.name, t.type
                ORDER BY amount DESC
                LIMIT 10
                """,
            (rs, rowNum) -> new CategoryInsight(
                rs.getObject("category_id", UUID.class),
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
}
