package com.finapp.services.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class GoalDTO {
    @NotBlank(message = "Goal name is required")
    @Size(min = 3, max = 200, message = "Name must be 3-200 characters")
    private String name;
    
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
    
    @NotNull(message = "Target amount is required")
    @Positive(message = "Target amount must be positive")
    private BigDecimal targetAmount;
    
    @NotNull(message = "Deadline is required")
    @Future(message = "Deadline must be in the future")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate deadline;
    
    @NotBlank(message = "Goal type is required")
    @Pattern(regexp = "SAVING|DEBT_REPAYMENT|INVESTMENT|PURCHASE", 
             message = "Type must be: SAVING, DEBT_REPAYMENT, INVESTMENT or PURCHASE")
    private String goalType;
    
    @Min(value = 1, message = "Priority must be 1-5")
    @Max(value = 5, message = "Priority must be 1-5")
    private Integer priority = 1;
    
    private BigDecimal autoSaveAmount;
    
    @Pattern(regexp = "DAILY|WEEKLY|MONTHLY|YEARLY", 
             message = "Frequency must be: DAILY, WEEKLY, MONTHLY or YEARLY")
    private String autoSaveFrequency;
    
    private String icon;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be in HEX format (#RRGGBB)")
    private String color;

    @Pattern(regexp = "[A-Z]{3}", message = "Currency must be 3 uppercase letters (e.g., RUB, USD)")
    private String currency = "RUB";
}