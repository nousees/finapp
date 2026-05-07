package com.finapp.services.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class BudgetDTO {
    @NotNull(message = "Category ID is required")
    private String categoryId;
    
    @NotNull(message = "Limit is required")
    @Positive(message = "Limit must be positive")
    private BigDecimal amountLimit;
    
    @NotBlank(message = "Period is required")
    @Pattern(regexp = "DAILY|WEEKLY|MONTHLY|YEARLY", 
             message = "Period must be: DAILY, WEEKLY, MONTHLY or YEARLY")
    private String period;
    
    @NotNull(message = "Start date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate periodStart;
    
    @NotNull(message = "End date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate periodEnd;
    
    @Size(min = 3, max = 3, message = "Currency must be 3 characters")
    private String currency = "RUB";
    
    private List<Integer> alertThresholds = List.of(50, 80, 90, 100);
    
    private Boolean isActive = true;
}