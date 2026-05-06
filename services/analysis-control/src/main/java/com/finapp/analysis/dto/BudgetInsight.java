package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BudgetInsight(
    UUID budgetId,
    UUID categoryId,
    LocalDate periodEnd,
    BigDecimal amountLimit,
    BigDecimal spentAmount,
    BigDecimal remainingAmount,
    BigDecimal progressPercent,
    String riskLevel,
    long daysRemaining,
    BigDecimal forecastedOverspend,
    String message
) {
}
