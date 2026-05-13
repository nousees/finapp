package com.finapp.analysis.model;

import com.finapp.analysis.dto.BudgetInsight;
import com.finapp.models.budget.Budget;
import com.finapp.services.budget.BudgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class BudgetInsightModel {

    private final BudgetService budgetService;
    private final JdbcTemplate jdbcTemplate;

    public List<BudgetInsight> analyzeBudgets(UUID userId, LocalDate analysisDate) {
        return budgetService.getActiveBudgets(userId).stream()
            .filter(budget -> isRelevantForDate(budget, analysisDate))
            .map(budget -> toInsight(budget, analysisDate))
            .sorted((left, right) -> Integer.compare(riskOrder(right.riskLevel()), riskOrder(left.riskLevel())))
            .toList();
    }

    private boolean isRelevantForDate(Budget budget, LocalDate analysisDate) {
        return !budget.getPeriodStart().isAfter(analysisDate) && !budget.getPeriodEnd().isBefore(analysisDate);
    }

    private int riskOrder(String riskLevel) {
        return switch (riskLevel) {
            case "HIGH" -> 3;
            case "MEDIUM" -> 2;
            default -> 1;
        };
    }

    private BudgetInsight toInsight(Budget budget, LocalDate analysisDate) {
        BigDecimal limit = AnalysisMath.nullToZero(budget.getAmountLimit());
        BigDecimal spent = querySpentAmount(budget);
        BigDecimal progress = AnalysisMath.percent(spent, limit);
        BigDecimal remaining = limit.subtract(spent).max(BigDecimal.ZERO);
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(analysisDate, budget.getPeriodEnd()));
        long elapsedDays = Math.max(1, ChronoUnit.DAYS.between(budget.getPeriodStart(), analysisDate) + 1);
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(budget.getPeriodStart(), budget.getPeriodEnd()) + 1);
        BigDecimal forecastedSpend = spent
            .multiply(BigDecimal.valueOf(totalDays))
            .divide(BigDecimal.valueOf(elapsedDays), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal forecastedOverspend = forecastedSpend.subtract(limit).max(BigDecimal.ZERO);
        String riskLevel = resolveRisk(progress, forecastedOverspend, daysRemaining);

        return new BudgetInsight(
            budget.getId(),
            budget.getCategoryId(),
            resolveCategoryName(budget.getCategoryId()),
            budget.getPeriodStart(),
            budget.getPeriodEnd(),
            AnalysisMath.money(limit),
            AnalysisMath.money(spent),
            AnalysisMath.money(remaining),
            AnalysisMath.money(progress),
            riskLevel,
            daysRemaining,
            AnalysisMath.money(forecastedOverspend),
            buildMessage(riskLevel, progress, forecastedOverspend, daysRemaining)
        );
    }

    private String resolveRisk(BigDecimal progress, BigDecimal forecastedOverspend, long daysRemaining) {
        if (progress.compareTo(BigDecimal.valueOf(100)) >= 0 || forecastedOverspend.compareTo(BigDecimal.ZERO) > 0) {
            return "HIGH";
        }
        if (progress.compareTo(BigDecimal.valueOf(85)) >= 0 || (progress.compareTo(BigDecimal.valueOf(70)) >= 0 && daysRemaining > 7)) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String buildMessage(String riskLevel, BigDecimal progress, BigDecimal forecastedOverspend, long daysRemaining) {
        if ("HIGH".equals(riskLevel) && forecastedOverspend.compareTo(BigDecimal.ZERO) > 0) {
            return "Бюджет в зоне риска: прогнозируется перерасход " + AnalysisMath.money(forecastedOverspend) + ".";
        }
        if ("HIGH".equals(riskLevel)) {
            return "Лимит бюджета уже достигнут или превышен.";
        }
        if ("MEDIUM".equals(riskLevel)) {
            return "Бюджет использован на " + AnalysisMath.money(progress) + "%, до конца периода осталось " + daysRemaining + " дн.";
        }
        return "Бюджет используется в безопасном темпе.";
    }

    private String resolveCategoryName(UUID categoryId) {
        if (categoryId == null) {
            return "Общий бюджет";
        }
        List<String> names = jdbcTemplate.queryForList(
            "SELECT name FROM categories WHERE id = ? LIMIT 1",
            String.class,
            categoryId
        );
        return names.isEmpty() ? "Категория" : names.get(0);
    }

    private BigDecimal querySpentAmount(Budget budget) {
        BigDecimal value;
        if (budget.getCategoryId() == null) {
            value = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ?
                  AND UPPER(type) = 'EXPENSE'
                  AND date >= ?
                  AND date < ?
                """,
                BigDecimal.class,
                budget.getUserId(),
                budget.getPeriodStart().atStartOfDay(),
                budget.getPeriodEnd().plusDays(1).atStartOfDay()
            );
        } else {
            value = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ?
                  AND UPPER(type) = 'EXPENSE'
                  AND COALESCE(category_id, ml_category_id) = ?
                  AND date >= ?
                  AND date < ?
                """,
                BigDecimal.class,
                budget.getUserId(),
                budget.getCategoryId(),
                budget.getPeriodStart().atStartOfDay(),
                budget.getPeriodEnd().plusDays(1).atStartOfDay()
            );
        }
        return AnalysisMath.money(value);
    }
}
