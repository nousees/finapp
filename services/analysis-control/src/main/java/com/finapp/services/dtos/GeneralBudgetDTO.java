package com.finapp.services.dtos;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class GeneralBudgetDTO {
    private UUID id;
    private UUID userId;
    private BigDecimal totalLimit;
    private BigDecimal spentAmount;
    private String period;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private OffsetDateTime  createdAt;
    private OffsetDateTime updatedAt;
}