package com.finapp.services.report;

import com.finapp.analysis.model.FinancialAnalysisFacade;
import com.finapp.models.report.Report;
import com.finapp.repositories.report.ReportRepository;
import com.finapp.services.exceptions.AppException;
import com.finapp.services.exceptions.NotFoundException;
import com.finapp.services.exceptions.ValidationException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ObjectMapper objectMapper;
    private final FinancialAnalysisFacade financialAnalysisFacade;

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
        Object reportData;

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

    private Object generateMonthlySummary(UUID userId,
                                                      LocalDate periodStart,
                                                      LocalDate periodEnd) {
        return financialAnalysisFacade.analyzeUser(userId, periodStart, periodEnd);
    }

    private Object generateCategoryAnalysis(UUID userId,
                                                        LocalDate periodStart,
                                                        LocalDate periodEnd) {
        return financialAnalysisFacade.analyzeUser(userId, periodStart, periodEnd).categories();
    }

    private Object generateGoalProgress(UUID userId) {
        return financialAnalysisFacade.analyzeCurrentMonth(userId).goals();
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
