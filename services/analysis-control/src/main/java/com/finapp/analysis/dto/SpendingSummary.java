package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SpendingSummary(
    LocalDate periodStart,
    LocalDate periodEnd,
    BigDecimal totalIncome,
    BigDecimal totalExpenses,
    BigDecimal netSavings,
    BigDecimal savingsRate,
    BigDecimal averageDailyExpense,
    long transactionCount,
    BigDecimal recurringExpenseTotal,
    BigDecimal dataQualityScore
) {
}
