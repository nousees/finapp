package com.finapp.controllers.shared;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.shared.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "API for viewing action logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_audit:read')")
    @Operation(summary = "Get user logs")
    public ResponseEntity<ApiResponse<?>> getUserAuditLogs(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        UUID userId = extractUserId(jwt);
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equals(sortParams[1])
            ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));

        return ResponseEntity.ok(
            ApiResponse.success(
                "Audit logs retrieved",
                auditLogService.getUserAuditLogs(userId, pageable)
            )
        );
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('SCOPE_audit:read')")
    @Operation(summary = "Search logs")
    public ResponseEntity<ApiResponse<?>> searchAuditLogs(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        UUID userId = extractUserId(jwt);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        return ResponseEntity.ok(
            ApiResponse.success(
                "Log search results",
                auditLogService.searchAuditLogs(userId, module, action, entityType,
                    startDate != null ? startDate : OffsetDateTime.now().minusDays(30),
                    endDate != null ? endDate : OffsetDateTime.now(),
                    pageable)
            )
        );
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasAuthority('SCOPE_audit:read')")
    @Operation(summary = "Get log statistics")
    public ResponseEntity<ApiResponse<?>> getAuditStatistics(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Log statistics retrieved",
                auditLogService.getAuditStatistics(userId)
            )
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
