package com.finapp.analysis.dto;

import java.util.List;

public record FinancialHealthScore(
    int score,
    String level,
    List<String> factors
) {
}
