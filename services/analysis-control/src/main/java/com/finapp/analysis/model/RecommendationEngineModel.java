package com.finapp.analysis.model;

import com.finapp.analysis.dto.BudgetInsight;
import com.finapp.analysis.dto.FinancialInsight;
import com.finapp.analysis.dto.GoalInsight;
import com.finapp.analysis.dto.RecommendationCandidate;
import com.finapp.analysis.dto.SpendingSummary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
public class RecommendationEngineModel {

    public List<RecommendationCandidate> generateRecommendations(FinancialInsight insight) {
        List<RecommendationCandidate> recommendations = new ArrayList<>();
        recommendations.addAll(generateBudgetRecommendations(insight.budgets()));
        recommendations.addAll(generateGoalRecommendations(insight.goals()));
        recommendations.addAll(generateCashflowRecommendations(insight.summary()));
        return recommendations.stream()
            .sorted((left, right) -> Integer.compare(right.priority(), left.priority()))
            .limit(6)
            .toList();
    }

    public List<RecommendationCandidate> generateBudgetRecommendations(List<BudgetInsight> budgets) {
        return budgets.stream()
            .filter(budget -> "HIGH".equals(budget.riskLevel()) || "MEDIUM".equals(budget.riskLevel()))
            .map(budget -> new RecommendationCandidate(
                "BUDGET_OPTIMIZATION",
                "Оптимизировать бюджет",
                budget.message(),
                List.of(
                    "Проверьте крупные расходы в этой категории",
                    "Снизьте средний дневной расход до конца периода",
                    "Перенесите необязательные покупки на следующий период"
                ),
                budget.forecastedOverspend().compareTo(BigDecimal.ZERO) > 0 ? budget.forecastedOverspend() : budget.spentAmount().multiply(BigDecimal.valueOf("0.10")),
                "HIGH".equals(budget.riskLevel()) ? 3 : 2,
                "HIGH".equals(budget.riskLevel())
            ))
            .toList();
    }

    public List<RecommendationCandidate> generateGoalRecommendations(List<GoalInsight> goals) {
        return goals.stream()
            .filter(goal -> "HIGH".equals(goal.riskLevel()) || "MEDIUM".equals(goal.riskLevel()))
            .map(goal -> new RecommendationCandidate(
                "GOAL_ACCELERATION",
                "Ускорить цель «" + goal.name() + "»",
                goal.message(),
                List.of(
                    "Настройте или увеличьте автосбережение",
                    "Проверьте необязательные расходы за последние 30 дней",
                    "Перенесите часть свободного cashflow в цель"
                ),
                goal.requiredMonthlyContribution(),
                "HIGH".equals(goal.riskLevel()) ? 3 : 2,
                "HIGH".equals(goal.riskLevel())
            ))
            .toList();
    }

    private List<RecommendationCandidate> generateCashflowRecommendations(SpendingSummary summary) {
        List<RecommendationCandidate> recommendations = new ArrayList<>();
        if (summary.netSavings().compareTo(BigDecimal.ZERO) < 0) {
            recommendations.add(new RecommendationCandidate(
                "CASHFLOW_PROTECTION",
                "Вернуть cashflow в плюс",
                "За период расходы превысили доходы на " + summary.netSavings().abs() + ".",
                List.of(
                    "Ограничьте необязательные расходы на ближайшие 7 дней",
                    "Проверьте регулярные списания и подписки",
                    "Сформируйте недельный лимит расходов"
                ),
                summary.netSavings().abs(),
                3,
                true
            ));
        }
        if (summary.recurringExpenseTotal().compareTo(BigDecimal.ZERO) > 0) {
            recommendations.add(new RecommendationCandidate(
                "RECURRING_PAYMENT_REVIEW",
                "Проверить регулярные платежи",
                "За период регулярные расходы составили " + summary.recurringExpenseTotal() + ".",
                List.of(
                    "Откройте список регулярных платежей",
                    "Отмените неиспользуемые подписки",
                    "Проверьте дублирующие сервисы"
                ),
                summary.recurringExpenseTotal().multiply(BigDecimal.valueOf("0.15")),
                1,
                false
            ));
        }
        return recommendations;
    }
}
