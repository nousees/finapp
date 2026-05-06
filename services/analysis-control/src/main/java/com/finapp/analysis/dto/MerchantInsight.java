package com.finapp.analysis.dto;

import java.math.BigDecimal;

public record MerchantInsight(
    String merchantName,
    BigDecimal amount,
    BigDecimal percentage,
    long transactionCount,
    BigDecimal averageTransaction
) {
}
