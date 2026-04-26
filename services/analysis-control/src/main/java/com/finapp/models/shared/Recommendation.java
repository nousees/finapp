package com.finapp.models.shared;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "recommendations")
public class Recommendation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "UUID")
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "type", nullable = false, length = 50)
    private String type; // BUDGET_OPTIMIZATION, SUBSCRIPTION_CANCELLATION, SAVING_TIP, HABIT_CHANGE
    
    @Column(name = "title", nullable = false, length = 255)
    private String title;
    
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "action_items", columnDefinition = "jsonb")
    private String actionItems;
    
    @Column(name = "estimated_savings", precision = 10, scale = 2)
    private BigDecimal estimatedSavings;
    
    @Column(name = "priority")
    private Integer priority = 1;
    
    @Column(name = "is_applied")
    private Boolean isApplied = false;
    
    @Column(name = "applied_at")
    private OffsetDateTime appliedAt;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
