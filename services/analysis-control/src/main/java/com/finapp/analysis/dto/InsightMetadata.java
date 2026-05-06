package com.finapp.analysis.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record InsightMetadata(
    OffsetDateTime generatedAt,
    String modelVersion,
    List<String> dataSources,
    List<String> limitations
) {
}
