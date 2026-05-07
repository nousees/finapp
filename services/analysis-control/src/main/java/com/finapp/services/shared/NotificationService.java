package com.finapp.services.shared;

import com.finapp.models.shared.Notification;
import com.finapp.models.shared.NotificationTemplate;
import com.finapp.repositories.shared.NotificationRepository;
import com.finapp.repositories.shared.NotificationTemplateRepository;
import com.finapp.services.exceptions.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;
    private final ObjectMapper objectMapper;
    
    public List<Notification> getUserNotifications(UUID userId) {
        return notificationRepository.findByUserId(userId);
    }
    
    public Page<Notification> getUserNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserId(userId, pageable);
    }
    
    public List<Notification> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }
    
    public Long getUnreadCount(UUID userId) {
        return notificationRepository.countUnreadNotifications(userId);
    }
    
    @Transactional
    public Notification createNotification(UUID userId, String type, String title, 
                                         String message, String sourceModule,
                                         String entityType, UUID entityId, 
                                         Map<String, Object> data) {
        log.info("Creating notification type {} for user: {}", type, userId);
        
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setSourceModule(sourceModule);
        notification.setEntityType(entityType);
        notification.setEntityId(entityId);
        
        if (data != null) {
            try {
                notification.setData(objectMapper.writeValueAsString(data));
            } catch (JsonProcessingException e) {
                log.error("Error converting notification data to JSON", e);
            }
        }
        
        return notificationRepository.save(notification);
    }
    
    @Transactional
    public Notification createNotificationFromTemplate(UUID userId, String templateType,
                                                      Map<String, String> parameters,
                                                      String sourceModule,
                                                      String entityType, UUID entityId) {
        NotificationTemplate template = notificationTemplateRepository.findByType(templateType)
            .orElseThrow(() -> new NotFoundException("Notification template", templateType));
        
        String title = replacePlaceholders(template.getTitleTemplate(), parameters);
        String message = replacePlaceholders(template.getMessageTemplate(), parameters);
        
        return createNotification(userId, templateType, title, message, 
                                 sourceModule, entityType, entityId, null);
    }
    
    @Transactional
    public Notification createBudgetAlert(UUID userId, UUID budgetId, 
                                         String budgetName, Double currentSpent,
                                         Double limit, Integer threshold) {
        Map<String, String> params = Map.of(
            "budgetName", budgetName,
            "currentSpent", String.valueOf(currentSpent),
            "limit", String.valueOf(limit),
            "threshold", String.valueOf(threshold),
            "percentage", String.format("%.0f%%", (currentSpent / limit * 100))
        );
        
        return createNotificationFromTemplate(userId, "BUDGET_ALERT", params, 
                                             "BUDGET", "budget", budgetId);
    }
    
    @Transactional
    public Notification createGoalProgressNotification(UUID userId, UUID goalId,
                                                      String goalName, Double currentAmount,
                                                      Double targetAmount, Double progress) {
        Map<String, String> params = Map.of(
            "goalName", goalName,
            "currentAmount", String.valueOf(currentAmount),
            "targetAmount", String.valueOf(targetAmount),
            "progress", String.format("%.0f%%", progress)
        );
        
        return createNotificationFromTemplate(userId, "GOAL_PROGRESS", params,
                                             "GOAL", "goal", goalId);
    }
    
    @Transactional
    public void markAsRead(UUID userId, List<UUID> notificationIds) {
        if (notificationIds == null || notificationIds.isEmpty()) {
            List<Notification> unread = getUnreadNotifications(userId);
            notificationIds = unread.stream()
                .map(Notification::getId)
                .collect(Collectors.toList());
        }
        
        if (!notificationIds.isEmpty()) {
            notificationRepository.markAsRead(notificationIds, userId);
            log.info("Marked {} notifications as read for user: {}", 
                    notificationIds.size(), userId);
        }
    }
    
    @Transactional
    public void cleanupOldNotifications(UUID userId, int daysToKeep) {
        OffsetDateTime cutoffDate = OffsetDateTime.now().minusDays(daysToKeep);
        notificationRepository.deleteOldReadNotifications(userId, cutoffDate);
    }

    @Transactional
    public void sendScheduledNotifications() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Notification> scheduled = notificationRepository
            .findScheduledNotifications(null, now);
        
        for (Notification notification : scheduled) {
            log.info("Sending scheduled notification: {}", notification.getId());
        }
    }
    
    private String replacePlaceholders(String template, Map<String, String> parameters) {
        String result = template;
        for (Map.Entry<String, String> entry : parameters.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }
}