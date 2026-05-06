package com.finapp.analysis.model;

import com.finapp.analysis.dto.BudgetInsight;
import com.finapp.analysis.dto.CategoryInsight;
import com.finapp.analysis.dto.FinancialHealthScore;
import com.finapp.analysis.dto.FinancialInsight;
import com.finapp.analysis.dto.GoalInsight;
import com.finapp.analysis.dto.RecommendationCandidate;
import com.finapp.analysis.dto.SpendingSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FinancialAnalysisFacade {

    private final TransactionAnalyticsModel transactionAnalyticsModel;
    private final BudgetInsightModel budgetInsightModel;
    private final GoalInsightModel goalInsightModel;
    private final FinancialHealthScoreModel financialHealthScoreModel;
    private final RecommendationEngineModel recommendationEngineModel;

    public FinancialInsight analyzeUser(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        SpendingSummary summary = transactionAnalyticsModel.analyzeSpending(userId, periodStart, periodEnd);
        List<CategoryInsight> categories = transactionAnalyticsModel.analyzeCategories(userId, periodStart, periodEnd);
        List<BudgetInsight> budgets = budgetInsightModel.analyzeBudgets(userId, periodEnd);
        List<GoalInsight> goals = goalInsightModel.analyzeGoals(userId, periodEnd);
        FinancialHealthScore healthScore = financialHealthScoreModel.calculate(summary, budgets, goals);

        FinancialInsight baseInsight = new FinancialInsight(
            periodStart,
            periodEnd,
            summary,
            healthScore,
            categories,
            budgets,
            goals,
            List.of()
        );
        List<RecommendationCandidate> recommendations = recommendationEngineModel.generateRecommendations(baseInsight);

        return new FinancialInsight(
            periodStart,
            periodEnd,
            summary,
            healthScore,
            categories,
            budgets,
            goals,
            recommendations
        );
    }

    public FinancialInsight analyzeCurrentMonth(UUID userId) {
        LocalDate today = LocalDate.now();
        return analyzeUser(userId, today.withDayOfMonth(1), today);
    }
}
