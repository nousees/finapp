package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.util.List;

public record RecommendationCandidate(
    String type,
    String title,
    String description,
    List<String> actionItems,
    BigDecimal estimatedSavings,
    Integer priority,
    boolean shouldNotify
) {
}
