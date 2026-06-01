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
    public NotificationTemplate createTemplate(
            String type,
            String titleTemplate,
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
    public NotificationTemplate updateTemplate(
            UUID templateId,
            String titleTemplate,
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
            createTemplate("BUDGET_EXCEEDED", "Бюджет превышен: {{budgetName}}", "Лимит превышен. Проверьте последние операции и скорректируйте траты.", 3),
            createTemplate("BUDGET_FORECAST_RISK", "Темп расходов выше плана", "По текущему темпу бюджет может закончиться раньше срока.", 2),
            createTemplate("DAILY_SAFE_LIMIT", "Дневной лимит по бюджету", "Безопасный дневной лимит: {{safeDailyAmount}}. Осталось {{remaining}}.", 1),
            createTemplate("BUDGET_PERIOD_ENDING", "Бюджетный период скоро закончится", "До конца периода осталось {{daysLeft}} дней. Проверьте остаток бюджета.", 1),
            createGoalProgressTemplate(),
            createTemplate("GOAL_CONTRIBUTION_DUE", "Пора пополнить цель {{goalName}}", "Чтобы сохранить план, внесите {{requiredAmount}}.", 2),
            createTemplate("GOAL_BEHIND_SCHEDULE", "Цель {{goalName}} отстаёт", "Проверьте план: нужно откладывать около {{requiredMonthlyAmount}} в месяц.", 2),
            createTemplate("GOAL_DEADLINE_RISK", "Цель может не успеть", "До срока мало времени. Осталось накопить {{remainingAmount}}.", 3),
            createTemplate("GOAL_ALMOST_COMPLETED", "До цели осталось немного", "Осталось {{remainingAmount}}. Можно закрыть цель досрочно.", 2),
            createTemplate("GOAL_COMPLETED", "Цель достигнута", "Вы накопили {{targetAmount}}. Отличный результат.", 3),
            createSubscriptionReminderTemplate(),
            createTemplate("SUBSCRIPTION_RENEWAL", "Скоро спишется {{subscriptionName}}", "Проверьте подписку перед списанием {{amount}}.", 2),
            createTemplate("SUBSCRIPTION_UNUSED", "Проверить подписку {{subscriptionName}}", "Подписка выглядит редко используемой. Ответьте на один вопрос перед отменой.", 2),
            createTemplate("SUBSCRIPTION_DUPLICATE", "Похожие подписки", "Найдено несколько похожих подписок. Проверьте, все ли нужны.", 2),
            createTemplate("SUBSCRIPTION_PRICE_INCREASE", "Подписка подорожала", "Стоимость выросла. Проверьте тариф и альтернативы.", 2),
            createHabitDetectedTemplate(),
            createLargeTransactionTemplate(),
            createTemplate("UNUSUAL_TRANSACTION", "Нетипичная трата", "Операция отличается от обычных расходов. Проверьте категорию.", 3),
            createTemplate("CATEGORY_SPIKE", "Расходы в категории выросли", "Расходы заметно выше обычного. Проверьте операции.", 2),
            createTemplate("RECURRING_TRANSACTION_DETECTED", "Новая повторяющаяся трата", "FinApp заметил регулярный платёж. Проверьте, подписка ли это.", 1)
        );

        notificationTemplateRepository.saveAll(defaultTemplates);
        log.info("Created default notification templates");
    }


    private NotificationTemplate createTemplate(String type, String titleTemplate, String messageTemplate, Integer priority) {
        NotificationTemplate template = new NotificationTemplate();
        template.setType(type);
        template.setTitleTemplate(titleTemplate);
        template.setMessageTemplate(messageTemplate);
        template.setPriority(priority);
        return template;
    }

    private NotificationTemplate createBudgetAlertTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("BUDGET_ALERT");
        template.setTitleTemplate("Бюджет {{budgetName}} достиг {{threshold}}%");
        template.setMessageTemplate("Потрачено {{currentSpent}} из {{limit}} ({{percentage}}). Проверьте расходы в этой категории.");
        template.setPriority(2);
        return template;
    }

    private NotificationTemplate createGoalProgressTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("GOAL_PROGRESS");
        template.setTitleTemplate("Прогресс цели: {{goalName}}");
        template.setMessageTemplate("Накоплено {{currentAmount}} из {{targetAmount}} ({{progress}}). Продолжайте в том же темпе.");
        template.setPriority(3);
        return template;
    }

    private NotificationTemplate createSubscriptionReminderTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("SUBSCRIPTION_REMINDER");
        template.setTitleTemplate("Напоминание о подписке");
        template.setMessageTemplate("По подписке {{subscriptionName}} ожидается списание {{amount}}. Дата списания: {{date}}.");
        template.setPriority(1);
        return template;
    }

    private NotificationTemplate createHabitDetectedTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("HABIT_DETECTED");
        template.setTitleTemplate("Обнаружена финансовая привычка");
        template.setMessageTemplate("FinApp заметил регулярные расходы {{amount}} в категории {{category}}. За месяц: {{monthlyTotal}}.");
        template.setPriority(3);
        return template;
    }

    private NotificationTemplate createLargeTransactionTemplate() {
        NotificationTemplate template = new NotificationTemplate();
        template.setType("LARGE_TRANSACTION");
        template.setTitleTemplate("Крупная операция");
        template.setMessageTemplate("Найдена крупная операция на {{amount}} в категории {{category}}. Проверьте, что всё указано корректно.");
        template.setPriority(2);
        return template;
    }
}
