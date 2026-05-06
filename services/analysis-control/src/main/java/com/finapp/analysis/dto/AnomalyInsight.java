package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AnomalyInsight(
    String type,
    String severity,
    String title,
    String description,
    UUID transactionId,
    UUID categoryId,
    BigDecimal amount,
    BigDecimal baselineAmount,
    OffsetDateTime occurredAt
) {
}
