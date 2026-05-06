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
            .map(goal -> toInsight(userId, goal, analysisDate))
            .sorted((left, right) -> Integer.compare(riskOrder(right.riskLevel()), riskOrder(left.riskLevel())))
            .toList();
    }

    private GoalInsight toInsight(UUID userId, Goal goal, LocalDate analysisDate) {
        BigDecimal target = AnalysisMath.nullToZero(goal.getTargetAmount());
        BigDecimal current = AnalysisMath.nullToZero(goal.getCurrentAmount());
        BigDecimal remaining = target.subtract(current).max(BigDecimal.ZERO);
        BigDecimal progress = goalService.getGoalProgress(userId, goal.getId());
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(analysisDate, goal.getDeadline()));
        BigDecimal monthsRemaining = BigDecimal.valueOf(Math.max(1, Math.ceil(daysRemaining / 30.0)));
        BigDecimal requiredMonthly = remaining.divide(monthsRemaining, 2, RoundingMode.HALF_UP);
        String riskLevel = resolveRisk(progress, daysRemaining, requiredMonthly, goal.getAutoSaveAmount());

        return new GoalInsight(
            goal.getId(),
            goal.getName(),
            goal.getDeadline(),
            AnalysisMath.money(target),
            AnalysisMath.money(current),
            AnalysisMath.money(remaining),
            AnalysisMath.money(progress),
            riskLevel,
            daysRemaining,
            AnalysisMath.money(requiredMonthly),
            buildMessage(riskLevel, requiredMonthly, goal.getAutoSaveAmount())
        );
    }

    private String resolveRisk(BigDecimal progress, long daysRemaining, BigDecimal requiredMonthly, BigDecimal autoSaveAmount) {
        if (progress.compareTo(BigDecimal.valueOf(100)) >= 0) {
            return "LOW";
        }
        if (daysRemaining <= 0) {
            return "HIGH";
        }
        if (autoSaveAmount == null || autoSaveAmount.compareTo(requiredMonthly) < 0) {
            return daysRemaining <= 45 ? "HIGH" : "MEDIUM";
        }
        return "LOW";
    }

    private String buildMessage(String riskLevel, BigDecimal requiredMonthly, BigDecimal autoSaveAmount) {
        if ("HIGH".equals(riskLevel)) {
            return "Цель в зоне риска: нужен ежемесячный взнос около " + AnalysisMath.money(requiredMonthly) + ".";
        }
        if ("MEDIUM".equals(riskLevel)) {
            BigDecimal currentAutoSave = AnalysisMath.nullToZero(autoSaveAmount);
            BigDecimal increase = requiredMonthly.subtract(currentAutoSave).max(BigDecimal.ZERO);
            return "Для уверенного достижения цели увеличьте автосбережение примерно на " + AnalysisMath.money(increase) + ".";
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
