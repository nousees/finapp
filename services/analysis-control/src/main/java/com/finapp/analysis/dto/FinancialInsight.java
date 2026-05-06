package com.finapp.analysis.dto;

import java.time.LocalDate;
import java.util.List;

public record FinancialInsight(
    LocalDate periodStart,
    LocalDate periodEnd,
    SpendingSummary summary,
    FinancialHealthScore healthScore,
    List<CashflowPoint> cashflow,
    List<CategoryInsight> categories,
    List<MerchantInsight> merchants,
    List<BudgetInsight> budgets,
    List<GoalInsight> goals,
    List<AnomalyInsight> anomalies,
    List<RecommendationCandidate> recommendations,
    InsightMetadata metadata
) {
}
