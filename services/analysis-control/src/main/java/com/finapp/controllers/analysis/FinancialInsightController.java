package com.finapp.controllers.analysis;

import com.finapp.analysis.model.FinancialAnalysisFacade;
import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/insights")
@RequiredArgsConstructor
@Tag(name = "Financial Insights", description = "API for financial insight model results")
public class FinancialInsightController {

    private final FinancialAnalysisFacade financialAnalysisFacade;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_reports:read') or hasAuthority('SCOPE_recommendations:read')")
    @Operation(summary = "Get financial insights for a period")
    public ResponseEntity<ApiResponse<?>> getInsights(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodEnd) {
        UUID userId = JwtUserIdExtractor.extractUserId(jwt);
        LocalDate effectiveEnd = periodEnd != null ? periodEnd : LocalDate.now();
        LocalDate effectiveStart = periodStart != null ? periodStart : effectiveEnd.withDayOfMonth(1);

        return ResponseEntity.ok(
            ApiResponse.success(
                "Financial insights generated",
                financialAnalysisFacade.analyzeUser(userId, effectiveStart, effectiveEnd)
            )
        );
    }
}
