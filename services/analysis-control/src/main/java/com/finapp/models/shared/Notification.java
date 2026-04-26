package com.finapp.models.shared;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "notifications")
public class Notification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "UUID")
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "type", nullable = false, length = 50)
    private String type; // BUDGET_ALERT, GOAL_PROGRESS, SUBSCRIPTION_REMINDER, HABIT_DETECTED, LARGE_TRANSACTION, SYSTEM
    
    @Column(name = "title", nullable = false, length = 255)
    private String title;
    
    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;
    
    @Column(name = "source_module", nullable = false, length = 20)
    private String sourceModule; // GO, JAVA, ML, SYSTEM
    
    @Column(name = "entity_type", length = 50)
    private String entityType; // transaction, budget, goal, subscription
    
    @Column(name = "entity_id")
    private UUID entityId;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", columnDefinition = "jsonb")
    private String data;
    
    @Column(name = "is_read")
    private Boolean isRead = false;
    
    @Column(name = "is_archived")
    private Boolean isArchived = false;
    
    @Column(name = "scheduled_for")
    private OffsetDateTime scheduledFor;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
