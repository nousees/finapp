package com.finapp.analysis.model;

import com.finapp.analysis.dto.AnomalyInsight;
import com.finapp.analysis.dto.BudgetInsight;
import com.finapp.analysis.dto.CashflowPoint;
import com.finapp.analysis.dto.CategoryInsight;
import com.finapp.analysis.dto.FinancialHealthScore;
import com.finapp.analysis.dto.FinancialInsight;
import com.finapp.analysis.dto.GoalInsight;
import com.finapp.analysis.dto.InsightMetadata;
import com.finapp.analysis.dto.MerchantInsight;
import com.finapp.analysis.dto.RecommendationCandidate;
import com.finapp.analysis.dto.SpendingSummary;
import com.finapp.services.exceptions.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FinancialAnalysisFacade {

    private static final String MODEL_VERSION = "financial-insight-v1.0";

    private final TransactionAnalyticsModel transactionAnalyticsModel;
    private final BudgetInsightModel budgetInsightModel;
    private final GoalInsightModel goalInsightModel;
    private final FinancialHealthScoreModel financialHealthScoreModel;
    private final RecommendationEngineModel recommendationEngineModel;

    public FinancialInsight analyzeUser(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        validatePeriod(periodStart, periodEnd);

        SpendingSummary summary = transactionAnalyticsModel.analyzeSpending(userId, periodStart, periodEnd);
        List<CashflowPoint> cashflow = transactionAnalyticsModel.analyzeDailyCashflow(userId, periodStart, periodEnd);
        List<CategoryInsight> categories = transactionAnalyticsModel.analyzeCategories(userId, periodStart, periodEnd);
        List<MerchantInsight> merchants = transactionAnalyticsModel.analyzeMerchants(userId, periodStart, periodEnd);
        List<BudgetInsight> budgets = budgetInsightModel.analyzeBudgets(userId, periodEnd);
        List<GoalInsight> goals = goalInsightModel.analyzeGoals(userId, periodEnd);
        List<AnomalyInsight> anomalies = transactionAnalyticsModel.detectAnomalies(userId, periodStart, periodEnd);
        FinancialHealthScore healthScore = financialHealthScoreModel.calculate(summary, budgets, goals, anomalies);

        FinancialInsight baseInsight = new FinancialInsight(
            periodStart,
            periodEnd,
            summary,
            healthScore,
            cashflow,
            categories,
            merchants,
            budgets,
            goals,
            anomalies,
            List.of(),
            buildMetadata(summary)
        );
        List<RecommendationCandidate> recommendations = recommendationEngineModel.generateRecommendations(baseInsight);

        return new FinancialInsight(
            periodStart,
            periodEnd,
            summary,
            healthScore,
            cashflow,
            categories,
            merchants,
            budgets,
            goals,
            anomalies,
            recommendations,
            buildMetadata(summary)
        );
    }

    public FinancialInsight analyzeCurrentMonth(UUID userId) {
        LocalDate today = LocalDate.now();
        return analyzeUser(userId, today.withDayOfMonth(1), today);
    }

    private void validatePeriod(LocalDate periodStart, LocalDate periodEnd) {
        if (periodStart == null || periodEnd == null) {
            throw new ValidationException(
                "Insight period is required",
                Map.of("period", "periodStart and periodEnd are required")
            );
        }
        if (periodStart.isAfter(periodEnd)) {
            throw new ValidationException(
                "Invalid insight period",
                Map.of("period", "periodStart must be before or equal to periodEnd")
            );
        }
    }

    private InsightMetadata buildMetadata(SpendingSummary summary) {
        return new InsightMetadata(
            OffsetDateTime.now(ZoneOffset.UTC),
            MODEL_VERSION,
            List.of("transactions", "categories", "budgets", "goals", "recommendations", "notifications"),
            buildLimitations(summary)
        );
    }

    private List<String> buildLimitations(SpendingSummary summary) {
        if (summary.transactionCount() == 0) {
            return List.of("За выбранный период нет транзакций, поэтому часть инсайтов основана только на бюджетах и целях.");
        }
        if (summary.dataQualityScore().compareTo(java.math.BigDecimal.valueOf(80)) < 0) {
            return List.of("Часть транзакций не подтверждена или имеет низкую уверенность ML, рекомендации стоит проверить вручную.");
        }
        return List.of();
    }
}
