package com.finapp.services.report;

import com.finapp.models.report.DashboardWidget;
import com.finapp.services.budget.BudgetService;
import com.finapp.services.goal.GoalService;
import com.finapp.repositories.report.DashboardWidgetRepository;
import com.finapp.services.exceptions.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.HashMap;
import java.util.Map;



@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardWidgetService {
    
    private final DashboardWidgetRepository dashboardWidgetRepository;
    private final ObjectMapper objectMapper;
    private final ReportService reportService;
    private final BudgetService budgetService;
    private final GoalService goalService;
    
    public List<DashboardWidget> getUserWidgets(UUID userId) {
        log.info("Getting widgets for user: {}", userId);
        return dashboardWidgetRepository.findByUserIdOrderByPositionAsc(userId);
    }
    
    public List<DashboardWidget> getVisibleWidgets(UUID userId) {
        return dashboardWidgetRepository.findByUserIdAndIsVisibleTrue(userId);
    }
    
    public DashboardWidget getWidget(UUID userId, UUID widgetId) {
        return dashboardWidgetRepository.findByIdAndUserId(widgetId, userId)
            .orElseThrow(() -> new NotFoundException("Widget", widgetId));
    }
    
    @Transactional
    public DashboardWidget createWidget(UUID userId, String widgetType, 
                                       Integer position, String config) {
        log.info("Creating widget type {} for user: {}", widgetType, userId);
        
        DashboardWidget widget = new DashboardWidget();
        widget.setUserId(userId);
        widget.setWidgetType(widgetType);
        widget.setPosition(position != null ? position : 0);
        widget.setConfig(config);
        widget.setIsVisible(true);
        
        return dashboardWidgetRepository.save(widget);
    }
    
    @Transactional
    public DashboardWidget updateWidget(UUID userId, UUID widgetId, 
                                       Integer position, String config, Boolean isVisible) {
        DashboardWidget widget = getWidget(userId, widgetId);
        
        if (position != null) {
            widget.setPosition(position);
        }
        
        if (config != null) {
            widget.setConfig(config);
        }
        
        if (isVisible != null) {
            widget.setIsVisible(isVisible);
        }
        
        return dashboardWidgetRepository.save(widget);
    }
    
    @Transactional
    public void deleteWidget(UUID userId, UUID widgetId) {
        DashboardWidget widget = getWidget(userId, widgetId);
        dashboardWidgetRepository.delete(widget);
    }
    
    @Transactional
    public void updateWidgetsPositions(UUID userId, Map<UUID, Integer> positions) {
        for (Map.Entry<UUID, Integer> entry : positions.entrySet()) {
            dashboardWidgetRepository.updatePosition(entry.getKey(), userId, entry.getValue());
        }
        
        log.info("Updated positions for {} widgets for user: {}", positions.size(), userId);
    }
    
    @Transactional
    public void createDefaultWidgets(UUID userId) {
        List<DashboardWidget> defaultWidgets = List.of(
            createDefaultWidget(userId, "SPENDING_CHART", 0, 
                "{\"chartType\": \"line\", \"period\": \"month\"}"),
            createDefaultWidget(userId, "BUDGET_STATUS", 1, 
                "{\"showOnlyActive\": true, \"threshold\": 80}"),
            createDefaultWidget(userId, "GOAL_PROGRESS", 2, 
                "{\"showCompleted\": false, \"limit\": 5}"),
            createDefaultWidget(userId, "RECENT_TRANSACTIONS", 3, 
                "{\"limit\": 10, \"showCategories\": true}")
        );
        
        dashboardWidgetRepository.saveAll(defaultWidgets);
        log.info("Created default widgets for user: {}", userId);
    }
    
    private DashboardWidget createDefaultWidget(UUID userId, String widgetType, 
                                               Integer position, String config) {
        DashboardWidget widget = new DashboardWidget();
        widget.setUserId(userId);
        widget.setWidgetType(widgetType);
        widget.setPosition(position);
        widget.setConfig(config);
        widget.setIsVisible(true);
        return widget;
    }
    
    public Object getWidgetData(UUID userId, String widgetType) {
        Map<String, Object> data = new HashMap<>();
        
        switch (widgetType) {
            case "SPENDING_CHART":
                data = getSpendingChartData(userId);
                break;
            case "BUDGET_STATUS":
                data = getBudgetStatusData(userId);
                break;
            case "GOAL_PROGRESS":
                data = getGoalProgressData(userId);
                break;
            case "RECENT_TRANSACTIONS":
                data = getRecentTransactionsData(userId);
                break;
            default:
                data.put("error", "Unknown widget type");
        }
        
        return data;
    }
    
    private Map<String, Object> getSpendingChartData(UUID userId) {
        Map<String, Object> data = new HashMap<>();
        data.put("labels", List.of("Jan", "Feb", "Mar", "Apr"));
        data.put("datasets", List.of(
            Map.of("label", "Income", "data", List.of(100000, 120000, 110000, 130000)),
            Map.of("label", "Expenses", "data", List.of(80000, 90000, 85000, 95000))
        ));
        return data;
    }
    
    private Map<String, Object> getBudgetStatusData(UUID userId) {
        Map<String, Object> data = new HashMap<>();
        data.put("totalBudgets", 5);
        data.put("withinBudget", 3);
        data.put("exceeded", 1);
        data.put("nearLimit", 1);
        return data;
    }
    
    private Map<String, Object> getGoalProgressData(UUID userId) {
        Map<String, Object> data = new HashMap<>();
        data.put("totalGoals", 4);
        data.put("completed", 1);
        data.put("inProgress", 3);
        data.put("averageProgress", 65);
        return data;
    }
    
    private Map<String, Object> getRecentTransactionsData(UUID userId) {
        Map<String, Object> data = new HashMap<>();
        data.put("transactions", List.of(
            Map.of("amount", 1500, "category", "Groceries", "date", "2024-01-15"),
            Map.of("amount", 800, "category", "Transport", "date", "2024-01-14"),
            Map.of("amount", 2500, "category", "Entertainment", "date", "2024-01-13")
        ));
        return data;
    }
}