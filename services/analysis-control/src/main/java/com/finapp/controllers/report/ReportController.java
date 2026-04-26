package com.finapp.controllers.report;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.report.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "API for working with financial reports")
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_reports:read')")
    @Operation(summary = "Get all user reports")
    public ResponseEntity<ApiResponse<?>> getUserReports(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Reports retrieved successfully",
                reportService.getUserReports(userId)
            )
        );
    }

    @GetMapping("/{reportId}")
    @PreAuthorize("hasAuthority('SCOPE_reports:read')")
    @Operation(summary = "Get report by ID")
    public ResponseEntity<ApiResponse<?>> getReport(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID reportId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Report found",
                reportService.getReport(userId, reportId)
            )
        );
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAuthority('SCOPE_reports:write')")
    @Operation(summary = "Create new report")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Report created successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Report already exists for this period"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<ApiResponse<?>> createReport(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String reportType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodEnd) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(
            ApiResponse.success(
                "Report created successfully",
                reportService.createReport(userId, reportType, periodStart, periodEnd)
            )
        );
    }

    @DeleteMapping("/{reportId}")
    @PreAuthorize("hasAuthority('SCOPE_reports:write')")
    @Operation(summary = "Delete report")
    public ResponseEntity<ApiResponse<?>> deleteReport(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID reportId) {
        UUID userId = extractUserId(jwt);
        reportService.deleteReport(userId, reportId);
        return ResponseEntity.ok(
            ApiResponse.success("Report deleted successfully", null)
        );
    }

    @PostMapping("/generate-scheduled")
    @PreAuthorize("hasAuthority('SCOPE_reports:write')")
    @Operation(summary = "Generate scheduled reports")
    public ResponseEntity<ApiResponse<?>> generateScheduledReports(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        reportService.generateScheduledReports(userId);
        return ResponseEntity.ok(
            ApiResponse.success("Scheduled reports generated", null)
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
