package com.finapp.analysis.dto;

import java.time.LocalDate;
import java.util.List;

public record FinancialInsight(
    LocalDate periodStart,
    LocalDate periodEnd,
    SpendingSummary summary,
    FinancialHealthScore healthScore,
    List<CategoryInsight> categories,
    List<BudgetInsight> budgets,
    List<GoalInsight> goals,
    List<RecommendationCandidate> recommendations
) {
}
