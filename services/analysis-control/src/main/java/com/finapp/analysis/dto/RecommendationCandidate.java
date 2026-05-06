package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record RecommendationCandidate(
    String type,
    String title,
    String description,
    List<String> actionItems,
    BigDecimal estimatedSavings,
    Integer priority,
    boolean shouldNotify,
    String entityType,
    UUID entityId,
    String sourceModel
) {
}
