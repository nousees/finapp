package com.finapp.analysis.model;

import com.finapp.analysis.dto.AnomalyInsight;
import com.finapp.analysis.dto.BudgetInsight;
import com.finapp.analysis.dto.FinancialInsight;
import com.finapp.analysis.dto.GoalInsight;
import com.finapp.analysis.dto.MerchantInsight;
import com.finapp.analysis.dto.RecommendationCandidate;
import com.finapp.analysis.dto.SpendingSummary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
public class RecommendationEngineModel {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal SMALL_SAVING_RATE = BigDecimal.valueOf(10);
    private static final BigDecimal HEALTHY_SAVING_RATE = BigDecimal.valueOf(20);

    public List<RecommendationCandidate> generateRecommendations(FinancialInsight insight) {
        List<RecommendationCandidate> recommendations = new ArrayList<>();
        recommendations.addAll(generateCashflowRecommendations(insight.summary()));
        recommendations.addAll(generateBudgetRecommendations(insight.budgets()));
        recommendations.addAll(generateGoalRecommendations(insight.goals()));
        recommendations.addAll(generateAnomalyRecommendations(insight.anomalies()));
        recommendations.addAll(generateMerchantRecommendations(insight.merchants(), insight.summary()));
        recommendations.addAll(generateDataQualityRecommendations(insight.summary()));

        return recommendations.stream()
            .sorted(
                Comparator
                    .comparing(RecommendationCandidate::priority, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(RecommendationCandidate::estimatedSavings, Comparator.nullsLast(Comparator.reverseOrder()))
            )
            .limit(8)
            .toList();
    }

    public List<RecommendationCandidate> generateBudgetRecommendations(List<BudgetInsight> budgets) {
        return budgets.stream()
            .filter(budget -> "HIGH".equals(budget.riskLevel()) || "MEDIUM".equals(budget.riskLevel()))
            .map(budget -> {
                boolean highRisk = "HIGH".equals(budget.riskLevel());
                BigDecimal saving = positiveOrFallback(
                    budget.forecastedOverspend(),
                    budget.spentAmount().multiply(new BigDecimal("0.10"))
                );
                return new RecommendationCandidate(
                    "BUDGET_OPTIMIZATION",
                    highRisk
                        ? "Бюджет почти исчерпан: " + budget.categoryName()
                        : "Снизить темп расходов: " + budget.categoryName(),
                    "По категории уже использовано " + budget.progressPercent() + "% лимита. " + budget.message(),
                    List.of(
                        "Проверьте последние операции в этой категории",
                        "Снизьте ежедневный расход до конца периода",
                        "Перенесите необязательные покупки на следующий месяц"
                    ),
                    saving,
                    highRisk ? 3 : 2,
                    highRisk,
                    "budget",
                    budget.budgetId(),
                    "BudgetInsightModel"
                );
            })
            .toList();
    }

    public List<RecommendationCandidate> generateGoalRecommendations(List<GoalInsight> goals) {
        return goals.stream()
            .filter(goal -> !"COMPLETED".equals(goal.status()))
            .filter(goal -> "HIGH".equals(goal.riskLevel()) || "MEDIUM".equals(goal.riskLevel()))
            .map(goal -> {
                boolean highRisk = "HIGH".equals(goal.riskLevel());
                return new RecommendationCandidate(
                    "GOAL_ACCELERATION",
                    highRisk ? "Цель отстаёт: " + goal.name() : "Поддержать прогресс цели: " + goal.name(),
                    goal.message(),
                    List.of(
                        "Пополняйте цель небольшими платежами после доходных операций",
                        "Направьте часть свободного баланса в цель",
                        "Проверьте категории, где можно высвободить деньги"
                    ),
                    positiveOrFallback(goal.requiredMonthlyContribution(), goal.remainingAmount().multiply(new BigDecimal("0.05"))),
                    highRisk ? 3 : 2,
                    highRisk,
                    "goal",
                    goal.goalId(),
                    "GoalInsightModel"
                );
            })
            .toList();
    }

    private List<RecommendationCandidate> generateCashflowRecommendations(SpendingSummary summary) {
        List<RecommendationCandidate> recommendations = new ArrayList<>();
        if (summary.transactionCount() == 0) {
            recommendations.add(new RecommendationCandidate(
                "DATA_START",
                "Добавьте первые операции",
                "Для точных советов FinApp нужны транзакции: ручной ввод, голос или импорт CSV/Excel.",
                List.of(
                    "Добавьте доход за текущий месяц",
                    "Загрузите выписку CSV/Excel",
                    "Создайте хотя бы один бюджет по основной категории"
                ),
                ZERO,
                1,
                false,
                null,
                null,
                "TransactionAnalyticsModel"
            ));
            return recommendations;
        }

        if (summary.netSavings().compareTo(ZERO) < 0) {
            recommendations.add(new RecommendationCandidate(
                "CASHFLOW_PROTECTION",
                "Вернуть баланс периода в плюс",
                "Расходы выше доходов на " + summary.netSavings().abs() + ". Лучше быстро ограничить необязательные траты.",
                List.of(
                    "Поставьте недельный лимит на переменные расходы",
                    "Проверьте подписки и регулярные списания",
                    "Отложите крупные покупки до следующего дохода"
                ),
                summary.netSavings().abs(),
                3,
                true,
                null,
                null,
                "TransactionAnalyticsModel"
            ));
        } else if (summary.savingsRate().compareTo(SMALL_SAVING_RATE) < 0) {
            recommendations.add(new RecommendationCandidate(
                "SAVINGS_RATE",
                "Увеличить норму накоплений",
                "Сейчас сохраняется около " + summary.savingsRate() + "% дохода. Цель на ближайший месяц - выйти хотя бы на 10-20%.",
                List.of(
                    "Сразу после дохода переводите часть суммы в цель",
                    "Сократите 1-2 самые крупные категории расходов",
                    "Проверьте средний дневной расход"
                ),
                summary.totalIncome().multiply(new BigDecimal("0.05")),
                2,
                false,
                null,
                null,
                "TransactionAnalyticsModel"
            ));
        } else if (summary.savingsRate().compareTo(HEALTHY_SAVING_RATE) >= 0) {
            recommendations.add(new RecommendationCandidate(
                "GOOD_FINANCIAL_HABIT",
                "Закрепить хороший темп накоплений",
                "Период выглядит устойчиво: доходы превышают расходы, а норма накоплений около " + summary.savingsRate() + "%.",
                List.of(
                    "Зафиксируйте автопополнение главной цели",
                    "Проверьте, не простаивает ли свободный баланс",
                    "Поддерживайте текущий лимит расходов"
                ),
                summary.netSavings().multiply(new BigDecimal("0.05")),
                1,
                false,
                null,
                null,
                "TransactionAnalyticsModel"
            ));
        }

        if (summary.recurringExpenseTotal().compareTo(ZERO) > 0) {
            recommendations.add(new RecommendationCandidate(
                "RECURRING_PAYMENT_REVIEW",
                "Проверить регулярные платежи",
                "За период регулярные расходы составили " + summary.recurringExpenseTotal() + ". Даже небольшая оптимизация даст быстрый эффект.",
                List.of(
                    "Откройте раздел подписок и запустите анализ",
                    "Удалите или отключите сервисы с низким индексом использования",
                    "Проверьте дублирующиеся подписки"
                ),
                summary.recurringExpenseTotal().multiply(new BigDecimal("0.15")),
                2,
                false,
                null,
                null,
                "TransactionAnalyticsModel"
            ));
        }

        return recommendations;
    }

    private List<RecommendationCandidate> generateAnomalyRecommendations(List<AnomalyInsight> anomalies) {
        return anomalies.stream()
            .filter(anomaly -> "HIGH".equals(anomaly.severity()) || "MEDIUM".equals(anomaly.severity()))
            .map(anomaly -> new RecommendationCandidate(
                "ANOMALY_REVIEW",
                "Проверить необычную операцию",
                anomaly.description(),
                List.of(
                    "Откройте транзакцию и проверьте категорию",
                    "Убедитесь, что сумма и дата указаны корректно",
                    "Если это регулярная трата, добавьте её в бюджет"
                ),
                positiveOrFallback(anomaly.amount().subtract(anomaly.baselineAmount()), ZERO),
                "HIGH".equals(anomaly.severity()) ? 3 : 2,
                "HIGH".equals(anomaly.severity()),
                anomaly.transactionId() != null ? "transaction" : "category",
                anomaly.transactionId() != null ? anomaly.transactionId() : anomaly.categoryId(),
                "TransactionAnalyticsModel"
            ))
            .toList();
    }

    private List<RecommendationCandidate> generateMerchantRecommendations(List<MerchantInsight> merchants, SpendingSummary summary) {
        if (summary.totalExpenses().compareTo(ZERO) == 0) {
            return List.of();
        }

        return merchants.stream()
            .filter(merchant -> merchant.percentage().compareTo(BigDecimal.valueOf(20)) >= 0 && merchant.transactionCount() >= 2)
            .limit(3)
            .map(merchant -> new RecommendationCandidate(
                "MERCHANT_SPENDING_REVIEW",
                "Высокие расходы: " + merchant.merchantName(),
                "На этого получателя приходится " + merchant.percentage() + "% расходов периода. Средний чек: " + merchant.averageTransaction() + ".",
                List.of(
                    "Проверьте, какие покупки повторяются чаще всего",
                    "Сравните цены или альтернативы",
                    "Поставьте лимит на следующую неделю"
                ),
                merchant.amount().multiply(new BigDecimal("0.10")),
                2,
                false,
                null,
                null,
                "TransactionAnalyticsModel"
            ))
            .toList();
    }

    private List<RecommendationCandidate> generateDataQualityRecommendations(SpendingSummary summary) {
        if (summary.transactionCount() == 0 || summary.dataQualityScore().compareTo(BigDecimal.valueOf(75)) >= 0) {
            return List.of();
        }
        return List.of(new RecommendationCandidate(
            "DATA_QUALITY",
            "Подтвердить категории операций",
            "Часть операций имеет низкую уверенность ML. После подтверждения категорий бюджеты и аналитика станут точнее.",
            List.of(
                "Откройте транзакции со статусом проверки",
                "Подтвердите или исправьте категорию",
                "Запустите рекомендации заново"
            ),
            ZERO,
            1,
            false,
            null,
            null,
            "TransactionAnalyticsModel"
        ));
    }

    private BigDecimal positiveOrFallback(BigDecimal value, BigDecimal fallback) {
        if (value != null && value.compareTo(ZERO) > 0) {
            return AnalysisMath.money(value);
        }
        return AnalysisMath.money(fallback == null ? ZERO : fallback.max(ZERO));
    }
}
