package com.finapp.services.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
public class BudgetViewDTO {
    private UUID id;
    private UUID userId;
    private UUID categoryId;
    private String categoryName;
    private BigDecimal amountLimit;
    private BigDecimal spentAmount;
    private BigDecimal remainingAmount;
    private BigDecimal progressPercent;
    private String period;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private String currency;
    private List<Integer> alertThresholds;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
