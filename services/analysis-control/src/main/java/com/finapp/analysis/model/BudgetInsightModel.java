package com.finapp.analysis.model;

import com.finapp.analysis.dto.BudgetInsight;
import com.finapp.models.budget.Budget;
import com.finapp.services.budget.BudgetService;
import lombok.RequiredArgsConstructor;
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

    public List<BudgetInsight> analyzeBudgets(UUID userId, LocalDate analysisDate) {
        return budgetService.getActiveBudgets(userId).stream()
            .map(budget -> toInsight(userId, budget, analysisDate))
            .sorted((left, right) -> Integer.compare(riskOrder(right.riskLevel()), riskOrder(left.riskLevel())))
            .toList();
    }

    private int riskOrder(String riskLevel) {
        return switch (riskLevel) {
            case "HIGH" -> 3;
            case "MEDIUM" -> 2;
            default -> 1;
        };
    }

    private BudgetInsight toInsight(UUID userId, Budget budget, LocalDate analysisDate) {
        BigDecimal limit = AnalysisMath.nullToZero(budget.getAmountLimit());
        BigDecimal spent = AnalysisMath.nullToZero(budget.getSpentAmount());
        BigDecimal progress = budgetService.getBudgetProgress(userId, budget.getId());
        BigDecimal remaining = limit.subtract(spent).max(BigDecimal.ZERO);
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(analysisDate, budget.getPeriodEnd()));
        long elapsedDays = Math.max(1, ChronoUnit.DAYS.between(budget.getPeriodStart(), analysisDate) + 1);
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(budget.getPeriodStart(), budget.getPeriodEnd()) + 1);
        BigDecimal forecastedSpend = spent
            .multiply(BigDecimal.valueOf(totalDays))
            .divide(BigDecimal.valueOf(elapsedDays), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal forecastedOverspend = forecastedSpend.subtract(limit).max(BigDecimal.ZERO);
        String riskLevel = resolveRisk(progress, forecastedOverspend);

        return new BudgetInsight(
            budget.getId(),
            budget.getCategoryId(),
            budget.getPeriodEnd(),
            AnalysisMath.money(limit),
            AnalysisMath.money(spent),
            AnalysisMath.money(remaining),
            AnalysisMath.money(progress),
            riskLevel,
            daysRemaining,
            AnalysisMath.money(forecastedOverspend),
            buildMessage(riskLevel, progress, forecastedOverspend)
        );
    }

    private String resolveRisk(BigDecimal progress, BigDecimal forecastedOverspend) {
        if (progress.compareTo(BigDecimal.valueOf(100)) >= 0 || forecastedOverspend.compareTo(BigDecimal.ZERO) > 0) {
            return "HIGH";
        }
        if (progress.compareTo(BigDecimal.valueOf(80)) >= 0) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String buildMessage(String riskLevel, BigDecimal progress, BigDecimal forecastedOverspend) {
        if ("HIGH".equals(riskLevel) && forecastedOverspend.compareTo(BigDecimal.ZERO) > 0) {
            return "Бюджет в зоне риска: прогнозируется перерасход " + AnalysisMath.money(forecastedOverspend) + ".";
        }
        if ("HIGH".equals(riskLevel)) {
            return "Лимит бюджета уже достигнут или превышен.";
        }
        if ("MEDIUM".equals(riskLevel)) {
            return "Бюджет использован на " + AnalysisMath.money(progress) + "%, стоит снизить темп расходов.";
        }
        return "Бюджет используется в безопасном темпе.";
    }
}
