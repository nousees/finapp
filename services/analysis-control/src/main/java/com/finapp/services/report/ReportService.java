package com.finapp.services.report;

import com.finapp.models.report.Report;
import com.finapp.repositories.report.ReportRepository;
import com.finapp.services.exceptions.AppException;
import com.finapp.services.exceptions.NotFoundException;
import com.finapp.services.exceptions.ValidationException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import com.finapp.services.budget.BudgetService;
import com.finapp.services.goal.GoalService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.Locale;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {
    
    private final ReportRepository reportRepository;
    private final ObjectMapper objectMapper;
    private final BudgetService budgetService;
    private final GoalService goalService;
    
    public List<Report> getUserReports(UUID userId) {
        log.info("Getting reports for user: {}", userId);
        return reportRepository.findByUserId(userId);
    }
    
    public Report getReport(UUID userId, UUID reportId) {
        log.info("Getting report {} for user: {}", reportId, userId);
        return reportRepository.findByIdAndUserId(reportId, userId)
            .orElseThrow(() -> new NotFoundException("Report", reportId));
    }
    
    @Transactional
    public Report createReport(UUID userId, String reportType, 
                              LocalDate periodStart, LocalDate periodEnd) {
        log.info("Creating report type {} for user: {}", reportType, userId);

        String normalizedReportType = normalizeReportType(reportType);

        if (periodStart.isAfter(periodEnd)) {
            throw new ValidationException(
                "Invalid report period",
                Map.of("period", "periodStart must be before or equal to periodEnd")
            );
        }
        
        reportRepository.findByUserIdAndReportTypeAndPeriodStartAndPeriodEnd(
            userId, normalizedReportType, periodStart, periodEnd)
            .ifPresent(report -> {
                throw new AppException("Report for this period already exists", HttpStatus.CONFLICT, "REPORT_ALREADY_EXISTS");
            });
        
        String reportData = generateReportData(userId, normalizedReportType, periodStart, periodEnd);
        
        Report report = new Report();
        report.setUserId(userId);
        report.setReportType(normalizedReportType);
        report.setPeriodStart(periodStart);
        report.setPeriodEnd(periodEnd);
        report.setData(reportData);
        
        return reportRepository.save(report);
    }
    
    @Transactional
    public void deleteReport(UUID userId, UUID reportId) {
        log.info("Deleting report {} for user: {}", reportId, userId);
        Report report = getReport(userId, reportId);
        reportRepository.delete(report);
    }
    
    private String generateReportData(UUID userId, String reportType, 
                                     LocalDate periodStart, LocalDate periodEnd) {
        Map<String, Object> reportData = new HashMap<>();
        
        switch (reportType) {
            case "MONTHLY_SUMMARY":
                reportData = generateMonthlySummary(userId, periodStart, periodEnd);
                break;
            case "CATEGORY_ANALYSIS":
                reportData = generateCategoryAnalysis(userId, periodStart, periodEnd);
                break;
            case "GOAL_PROGRESS":
                reportData = generateGoalProgress(userId);
                break;
            default:
                throw new ValidationException(
                    "Unknown report type",
                    Map.of("reportType", "Supported values: MONTHLY, MONTHLY_SUMMARY, CATEGORY, CATEGORY_ANALYSIS, GOALS, GOAL_PROGRESS")
                );
        }
        
        try {
            return objectMapper.writeValueAsString(reportData);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error generating report", e);
        }
    }

    private String normalizeReportType(String reportType) {
        if (reportType == null || reportType.isBlank()) {
            throw new ValidationException("Report type is required", Map.of("reportType", "reportType is required"));
        }

        return switch (reportType.trim().toUpperCase(Locale.ROOT)) {
            case "MONTHLY", "MONTHLY_SUMMARY" -> "MONTHLY_SUMMARY";
            case "CATEGORY", "CATEGORY_ANALYSIS" -> "CATEGORY_ANALYSIS";
            case "GOALS", "GOAL_PROGRESS" -> "GOAL_PROGRESS";
            default -> reportType.trim().toUpperCase(Locale.ROOT);
        };
    }
    
    private Map<String, Object> generateMonthlySummary(UUID userId, 
                                                      LocalDate periodStart, 
                                                      LocalDate periodEnd) {
        Map<String, Object> summary = new HashMap<>();

        summary.put("period", periodStart + " - " + periodEnd);
        summary.put("totalIncome", 0);
        summary.put("totalExpenses", 0);
        summary.put("netSavings", 0);
        summary.put("budgetAdherence", 85); 
        summary.put("topCategories", List.of("Groceries", "Transport", "Entertainment"));
        
        return summary;
    }
    
    private Map<String, Object> generateCategoryAnalysis(UUID userId, 
                                                        LocalDate periodStart, 
                                                        LocalDate periodEnd) {
        Map<String, Object> analysis = new HashMap<>();
        
        analysis.put("period", periodStart + " - " + periodEnd);
        analysis.put("categories", Map.of(
            "Groceries", Map.of("amount", 15000, "percentage", 30),
            "Transport", Map.of("amount", 8000, "percentage", 16),
            "Entertainment", Map.of("amount", 12000, "percentage", 24)
        ));
        
        return analysis;
    }
    
    private Map<String, Object> generateGoalProgress(UUID userId) {
        Map<String, Object> progress = new HashMap<>();
        
        progress.put("totalGoals", 5);
        progress.put("completedGoals", 2);
        progress.put("activeGoals", 3);
        progress.put("totalProgress", 65); 
        
        return progress;
    }
    
    @Transactional
    public void generateScheduledReports(UUID userId) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        
        createReport(userId, "MONTHLY_SUMMARY", monthStart, monthEnd);
        
        log.info("Automatically generated reports for user: {}", userId);
    }
}
