package com.finapp.services.shared;

import com.finapp.models.shared.NotificationTemplate;
import com.finapp.repositories.shared.NotificationTemplateRepository;
import com.finapp.services.exceptions.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationTemplateService {
    
    private final NotificationTemplateRepository notificationTemplateRepository;
    private final ObjectMapper objectMapper;
    
    public List<NotificationTemplate> getAllTemplates() {
        return notificationTemplateRepository.findAll();
    }
    
    public NotificationTemplate getTemplateByType(String type) {
        return notificationTemplateRepository.findByType(type)
            .orElseThrow(() -> new NotFoundException("Notification template", type));
    }
    
    public NotificationTemplate getTemplate(UUID templateId) {
        return notificationTemplateRepository.findById(templateId)
            .orElseThrow(() -> new NotFoundException("Notification template", templateId));
    }
    
    @Transactional
    public NotificationTemplate createTemplate(String type, String titleTemplate,
                                              String messageTemplate, 
                                              Map<String, Object> conditions,
                                              Integer priority) {
        if (notificationTemplateRepository.existsByType(type)) {
            throw new RuntimeException("Template with type " + type + " already exists");
        }
        
        NotificationTemplate template = new NotificationTemplate();
        template.setType(type);
        template.setTitleTemplate(titleTemplate);
        template.setMessageTemplate(messageTemplate);
        
        if (conditions != null) {
            try {
                template.setConditions(objectMapper.writeValueAsString(conditions));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error converting conditions to JSON", e);
            }
        }
        
        template.setPriority(priority != null ? priority : 1);
        
        return notificationTemplateRepository.save(template);
    }
    
    @Transactional
    public NotificationTemplate updateTemplate(UUID templateId, String titleTemplate,
                                              String messageTemplate,
                                              Map<String, Object> conditions,
                                              Integer priority) {
        NotificationTemplate template = getTemplate(templateId);
        
        if (titleTemplate != null) {
            template.setTitleTemplate(titleTemplate);
        }
        
        if (messageTemplate != null) {
            template.setMessageTemplate(messageTemplate);
        }
        
        if (conditions != null) {
            try {
                template.setConditions(objectMapper.writeValueAsString(conditions));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error converting conditions to JSON", e);
            }
        }
        
        if (priority != null) {
            template.setPriority(priority);
        }
        
        return notificationTemplateRepository.save(template);
    }
    
    @Transactional
    public void deleteTemplate(UUID templateId) {
        NotificationTemplate template = getTemplate(templateId);
        notificationTemplateRepository.delete(template);
    }
    
    @Transactional
    public void createDefaultTemplates() {
        List<NotificationTemplate> defaultTemplates = List.of(
            createBudgetAlertTemplate(),
            createGoalProgressTemplate(),
            createSubscriptionReminderTemplate(),
            createHabitDetectedTemplate(),
            createLargeTransactionTemplate()
        );
        
        notificationTemplateRepository.saveAll(defaultTemplates);
        log.info("Created default notification templates");
    }
    
    private NotificationTemplate createBudgetAlertTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("BUDGET_ALERT");
        template.setTitleTemplate("⚠️ Budget {{budgetName}} exceeded by {{threshold}}%");
        template.setMessageTemplate("You spent {{currentSpent}} out of {{limit}} ({{percentage}}). " +
                                   "Consider reducing expenses in this category.");
        template.setPriority(2);
        return template;
    }
    
    private NotificationTemplate createGoalProgressTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("GOAL_PROGRESS");
        template.setTitleTemplate("🎯 Goal progress: {{goalName}}");
        template.setMessageTemplate("Your progress: {{currentAmount}} out of {{targetAmount}} ({{progress}}). " +
                                   "Keep up the good work!");
        template.setPriority(3);
        return template;
    }
    
    private NotificationTemplate createSubscriptionReminderTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("SUBSCRIPTION_REMINDER");
        template.setTitleTemplate("📅 Subscription reminder");
        template.setMessageTemplate("Subscription '{{subscriptionName}}' will be charged {{amount}}. " +
                                   "Charge date: {{date}}.");
        template.setPriority(1);
        return template;
    }
    
    private NotificationTemplate createHabitDetectedTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("HABIT_DETECTED");
        template.setTitleTemplate("📈 Financial habit detected");
        template.setMessageTemplate("We noticed you regularly spend {{amount}} " +
                                   "on {{category}}. Monthly total: {{monthlyTotal}}.");
        template.setPriority(3);
        return template;
    }
    
    private NotificationTemplate createLargeTransactionTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("LARGE_TRANSACTION");
        template.setTitleTemplate("💰 Large transaction");
        template.setMessageTemplate("Large transaction of {{amount}} " +
                                   "in category {{category}}. Please verify everything is correct.");
        template.setPriority(2);
        return template;
    }
}