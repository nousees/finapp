package com.finapp.repositories.shared;

import com.finapp.models.shared.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    
    List<AuditLog> findByUserId(UUID userId);
    
    Page<AuditLog> findByUserId(UUID userId, Pageable pageable);
    
    List<AuditLog> findByModule(String module);
    
    List<AuditLog> findByAction(String action);
    
    List<AuditLog> findByEntityTypeAndEntityId(String entityType, UUID entityId);
    
    List<AuditLog> findByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end);
    
    List<AuditLog> findByUserIdAndCreatedAtBetween(
        UUID userId, OffsetDateTime start, OffsetDateTime end);
    
    @Query("SELECT al FROM AuditLog al WHERE " +
           "(:userId IS NULL OR al.userId = :userId) AND " +
           "(:module IS NULL OR al.module = :module) AND " +
           "(:action IS NULL OR al.action = :action) AND " +
           "(:entityType IS NULL OR al.entityType = :entityType) AND " +
           "al.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY al.createdAt DESC")
    Page<AuditLog> searchAuditLogs(
        @Param("userId") UUID userId,
        @Param("module") String module,
        @Param("action") String action,
        @Param("entityType") String entityType,
        @Param("startDate") OffsetDateTime startDate,
        @Param("endDate") OffsetDateTime endDate,
        Pageable pageable
    );
    
    @Query("DELETE FROM AuditLog al WHERE al.createdAt < :cutoffDate")
    void deleteOldLogs(@Param("cutoffDate") OffsetDateTime cutoffDate);
}
