package com.finapp.analysis.model;

import com.finapp.analysis.dto.GoalInsight;
import com.finapp.models.goal.Goal;
import com.finapp.services.goal.GoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class GoalInsightModel {

    private final GoalService goalService;

    public List<GoalInsight> analyzeGoals(UUID userId, LocalDate analysisDate) {
        return goalService.getActiveGoals(userId).stream()
            .map(goal -> toInsight(goal, analysisDate))
            .sorted((left, right) -> Integer.compare(riskOrder(right.riskLevel()), riskOrder(left.riskLevel())))
            .toList();
    }

    private GoalInsight toInsight(Goal goal, LocalDate analysisDate) {
        BigDecimal target = AnalysisMath.nullToZero(goal.getTargetAmount());
        BigDecimal current = AnalysisMath.nullToZero(goal.getCurrentAmount());
        BigDecimal remaining = target.subtract(current).max(BigDecimal.ZERO);
        BigDecimal progress = AnalysisMath.percent(current, target);
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(analysisDate, goal.getDeadline()));
        BigDecimal monthsRemaining = BigDecimal.valueOf(Math.max(1, Math.ceil(daysRemaining / 30.0)));
        BigDecimal requiredMonthly = remaining.divide(monthsRemaining, 2, RoundingMode.HALF_UP);
        BigDecimal monthlyAutoSaveEquivalent = monthlyAutoSaveEquivalent(goal.getAutoSaveAmount(), goal.getAutoSaveFrequency());
        String riskLevel = resolveRisk(progress, daysRemaining, requiredMonthly, monthlyAutoSaveEquivalent);

        return new GoalInsight(
            goal.getId(),
            goal.getName(),
            goal.getStatus(),
            goal.getPriority(),
            goal.getDeadline(),
            AnalysisMath.money(target),
            AnalysisMath.money(current),
            AnalysisMath.money(remaining),
            AnalysisMath.money(progress),
            riskLevel,
            daysRemaining,
            AnalysisMath.money(requiredMonthly),
            AnalysisMath.money(monthlyAutoSaveEquivalent),
            buildMessage(riskLevel, requiredMonthly, monthlyAutoSaveEquivalent)
        );
    }

    private BigDecimal monthlyAutoSaveEquivalent(BigDecimal autoSaveAmount, String autoSaveFrequency) {
        BigDecimal amount = AnalysisMath.nullToZero(autoSaveAmount);
        if (autoSaveFrequency == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return switch (autoSaveFrequency.toUpperCase()) {
            case "DAILY" -> amount.multiply(BigDecimal.valueOf(30));
            case "WEEKLY" -> amount.multiply(BigDecimal.valueOf(4));
            case "YEARLY" -> amount.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            default -> amount;
        };
    }

    private String resolveRisk(BigDecimal progress, long daysRemaining, BigDecimal requiredMonthly, BigDecimal monthlyAutoSaveEquivalent) {
        if (progress.compareTo(BigDecimal.valueOf(100)) >= 0) {
            return "LOW";
        }
        if (daysRemaining <= 0) {
            return "HIGH";
        }
        if (monthlyAutoSaveEquivalent.compareTo(requiredMonthly) < 0) {
            return daysRemaining <= 45 ? "HIGH" : "MEDIUM";
        }
        return "LOW";
    }

    private String buildMessage(String riskLevel, BigDecimal requiredMonthly, BigDecimal monthlyAutoSaveEquivalent) {
        if ("HIGH".equals(riskLevel)) {
            return "Цель в зоне риска: нужен ежемесячный взнос около " + AnalysisMath.money(requiredMonthly) + ".";
        }
        if ("MEDIUM".equals(riskLevel)) {
            BigDecimal increase = requiredMonthly.subtract(monthlyAutoSaveEquivalent).max(BigDecimal.ZERO);
            return "Для уверенного достижения цели увеличьте ежемесячное автосбережение примерно на " + AnalysisMath.money(increase) + ".";
        }
        return "Цель движется в хорошем темпе.";
    }

    private int riskOrder(String riskLevel) {
        return switch (riskLevel) {
            case "HIGH" -> 3;
            case "MEDIUM" -> 2;
            default -> 1;
        };
    }
}
