package com.finapp.services.shared;

import com.finapp.models.shared.AuditLog;
import com.finapp.repositories.shared.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {
    
    private final AuditLogRepository auditLogRepository;
    
    @Transactional
    public AuditLog logAction(UUID userId, String action, String entityType,
                             UUID entityId, String module, String ipAddress,
                             String userAgent, Map<String, Object> details) {
        log.debug("Logging action: {} for user: {}", action, userId);
        
        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(userId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setModule(module);
        auditLog.setIpAddress(ipAddress);
        auditLog.setUserAgent(userAgent);
        
        if (details != null && !details.isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                auditLog.setDetails(mapper.writeValueAsString(details));
            } catch (Exception e) {
                log.error("Error converting audit details to JSON", e);
            }
        }
        
        return auditLogRepository.save(auditLog);
    }
    
    @Transactional
    public AuditLog logSimpleAction(UUID userId, String action, String module) {
        return logAction(userId, action, null, null, module, null, null, null);
    }
    
    public Page<AuditLog> getUserAuditLogs(UUID userId, Pageable pageable) {
        return auditLogRepository.findByUserId(userId, pageable);
    }
    
    public Page<AuditLog> searchAuditLogs(UUID userId, String module, String action,
                                         String entityType, OffsetDateTime startDate,
                                         OffsetDateTime endDate, Pageable pageable) {
        return auditLogRepository.searchAuditLogs(
            userId, module, action, entityType, startDate, endDate, pageable
        );
    }
    
    @Transactional
    public void logBudgetCreation(UUID userId, UUID budgetId, Map<String, Object> budgetDetails) {
        logAction(userId, "BUDGET_CREATE", "budget", budgetId, "BUDGET", 
                 getClientIp(), getUserAgent(), budgetDetails);
    }
    
    @Transactional
    public void logBudgetUpdate(UUID userId, UUID budgetId, Map<String, Object> changes) {
        logAction(userId, "BUDGET_UPDATE", "budget", budgetId, "BUDGET",
                 getClientIp(), getUserAgent(), changes);
    }
    
    @Transactional
    public void logGoalCreation(UUID userId, UUID goalId, Map<String, Object> goalDetails) {
        logAction(userId, "GOAL_CREATE", "goal", goalId, "GOAL",
                 getClientIp(), getUserAgent(), goalDetails);
    }
    
    @Transactional
    public void cleanupOldLogs(int daysToKeep) {
        OffsetDateTime cutoffDate = OffsetDateTime.now().minusDays(daysToKeep);
        auditLogRepository.deleteOldLogs(cutoffDate);
        log.info("Cleaned up audit logs older than {} days", daysToKeep);
    }
    
    public Map<String, Object> getAuditStatistics(UUID userId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("todayCount", 0);
        stats.put("weekCount", 0);
        stats.put("monthCount", 0);
        return stats;
    }
    
    private String getClientIp() {
        return "127.0.0.1";
    }
    
    private String getUserAgent() {
        return "TestClient/1.0";
    }
}