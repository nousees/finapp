package com.finapp.analysis.model;

import com.finapp.analysis.dto.AnomalyInsight;
import com.finapp.analysis.dto.BudgetInsight;
import com.finapp.analysis.dto.FinancialHealthScore;
import com.finapp.analysis.dto.GoalInsight;
import com.finapp.analysis.dto.SpendingSummary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
public class FinancialHealthScoreModel {

    public FinancialHealthScore calculate(
            SpendingSummary summary,
            List<BudgetInsight> budgets,
            List<GoalInsight> goals,
            List<AnomalyInsight> anomalies) {
        int score = 50;
        List<String> factors = new ArrayList<>();

        if (summary.netSavings().compareTo(BigDecimal.ZERO) >= 0) {
            score += 15;
            factors.add("Положительный cashflow за период.");
        } else {
            score -= 15;
            factors.add("Расходы выше доходов за период.");
        }

        if (summary.savingsRate().compareTo(BigDecimal.valueOf(20)) >= 0) {
            score += 10;
            factors.add("Хорошая доля сбережений: " + summary.savingsRate() + "%.");
        } else if (summary.totalIncome().compareTo(BigDecimal.ZERO) > 0) {
            score -= 5;
            factors.add("Доля сбережений ниже целевого уровня 20%.");
        }

        long highRiskBudgets = budgets.stream().filter(budget -> "HIGH".equals(budget.riskLevel())).count();
        if (highRiskBudgets == 0) {
            score += 10;
            factors.add("Нет бюджетов в высокой зоне риска.");
        } else {
            score -= Math.min(20, (int) highRiskBudgets * 8);
            factors.add("Бюджетов в высокой зоне риска: " + highRiskBudgets + ".");
        }

        long highRiskGoals = goals.stream().filter(goal -> "HIGH".equals(goal.riskLevel())).count();
        if (highRiskGoals == 0) {
            score += 10;
            factors.add("Активные цели не находятся в критической зоне.");
        } else {
            score -= Math.min(15, (int) highRiskGoals * 7);
            factors.add("Целей в высокой зоне риска: " + highRiskGoals + ".");
        }

        long highSeverityAnomalies = anomalies.stream().filter(anomaly -> "HIGH".equals(anomaly.severity())).count();
        if (highSeverityAnomalies > 0) {
            score -= Math.min(15, (int) highSeverityAnomalies * 5);
            factors.add("Найдены финансовые аномалии высокой важности: " + highSeverityAnomalies + ".");
        }

        if (summary.dataQualityScore().compareTo(BigDecimal.valueOf(80)) >= 0) {
            score += 5;
            factors.add("Качество данных достаточно высокое для рекомендаций.");
        } else {
            score -= 5;
            factors.add("Качество данных нужно улучшить: подтвердите транзакции с низкой уверенностью ML.");
        }

        int normalized = Math.max(0, Math.min(100, score));
        return new FinancialHealthScore(normalized, resolveLevel(normalized), factors);
    }

    private String resolveLevel(int score) {
        if (score >= 80) {
            return "EXCELLENT";
        }
        if (score >= 65) {
            return "GOOD";
        }
        if (score >= 45) {
            return "ATTENTION";
        }
        return "RISK";
    }
}
