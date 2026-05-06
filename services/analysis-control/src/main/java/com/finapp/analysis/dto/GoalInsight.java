package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GoalInsight(
    UUID goalId,
    String name,
    String status,
    Integer priority,
    LocalDate deadline,
    BigDecimal targetAmount,
    BigDecimal currentAmount,
    BigDecimal remainingAmount,
    BigDecimal progressPercent,
    String riskLevel,
    long daysRemaining,
    BigDecimal requiredMonthlyContribution,
    BigDecimal monthlyAutoSaveEquivalent,
    String message
) {
}
