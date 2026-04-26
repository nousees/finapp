package com.finapp.models.goal;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "goals")
public class Goal {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "UUID")
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "name", nullable = false, length = 200)
    private String name;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "target_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal targetAmount;
    
    @Column(name = "current_amount", precision = 15, scale = 2)
    private BigDecimal currentAmount = BigDecimal.ZERO;
    
    @Column(name = "currency", length = 3)
    private String currency = "RUB";
    
    @Column(name = "deadline", nullable = false)
    private LocalDate deadline;
    
    @Column(name = "goal_type", nullable = false, length = 20)
    private String goalType; // SAVING, DEBT_REPAYMENT, INVESTMENT, PURCHASE
    
    @Column(name = "priority")
    private Integer priority = 1;
    
    @Column(name = "status", length = 20)
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, CANCELLED
    
    @Column(name = "auto_save_amount", precision = 10, scale = 2)
    private BigDecimal autoSaveAmount;
    
    @Column(name = "auto_save_frequency", length = 20)
    private String autoSaveFrequency; // DAILY, WEEKLY, MONTHLY, YEARLY
    
    @Column(name = "icon", length = 50)
    private String icon;
    
    @Column(name = "color", length = 7)
    private String color;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}

