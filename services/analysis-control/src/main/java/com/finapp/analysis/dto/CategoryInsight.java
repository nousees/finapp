package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CategoryInsight(
    UUID categoryId,
    String categoryName,
    String type,
    BigDecimal amount,
    BigDecimal percentage,
    long transactionCount
) {
}
