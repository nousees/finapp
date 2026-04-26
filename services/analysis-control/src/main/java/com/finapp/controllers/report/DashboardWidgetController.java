package com.finapp.controllers.report;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.report.DashboardWidgetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboard/widgets")
@RequiredArgsConstructor
@Tag(name = "Dashboard Widgets", description = "API for managing main screen widgets")
public class DashboardWidgetController {

    private final DashboardWidgetService dashboardWidgetService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_dashboard:read')")
    @Operation(summary = "Get all user widgets")
    public ResponseEntity<ApiResponse<?>> getUserWidgets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Widgets retrieved successfully",
                dashboardWidgetService.getUserWidgets(userId)
            )
        );
    }

    @GetMapping("/visible")
    @PreAuthorize("hasAuthority('SCOPE_dashboard:read')")
    @Operation(summary = "Get visible widgets")
    public ResponseEntity<ApiResponse<?>> getVisibleWidgets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Visible widgets retrieved",
                dashboardWidgetService.getVisibleWidgets(userId)
            )
        );
    }

    @GetMapping("/{widgetId}")
    @PreAuthorize("hasAuthority('SCOPE_dashboard:read')")
    @Operation(summary = "Get widget by ID")
    public ResponseEntity<ApiResponse<?>> getWidget(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID widgetId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Widget found",
                dashboardWidgetService.getWidget(userId, widgetId)
            )
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_dashboard:write')")
    @Operation(summary = "Create new widget")
    public ResponseEntity<ApiResponse<?>> createWidget(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String widgetType,
            @RequestParam(required = false) Integer position,
            @RequestBody(required = false) String config) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(
                "Widget created successfully",
                dashboardWidgetService.createWidget(userId, widgetType, position, config)
            ));
    }

    @PutMapping("/{widgetId}")
    @PreAuthorize("hasAuthority('SCOPE_dashboard:write')")
    @Operation(summary = "Update widget")
    public ResponseEntity<ApiResponse<?>> updateWidget(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID widgetId,
            @RequestParam(required = false) Integer position,
            @RequestBody(required = false) String config,
            @RequestParam(required = false) Boolean isVisible) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Widget updated successfully",
                dashboardWidgetService.updateWidget(userId, widgetId, position, config, isVisible)
            )
        );
    }

    @DeleteMapping("/{widgetId}")
    @PreAuthorize("hasAuthority('SCOPE_dashboard:write')")
    @Operation(summary = "Delete widget")
    public ResponseEntity<ApiResponse<?>> deleteWidget(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID widgetId) {
        UUID userId = extractUserId(jwt);
        dashboardWidgetService.deleteWidget(userId, widgetId);
        return ResponseEntity.ok(
            ApiResponse.success("Widget deleted successfully", null)
        );
    }

    @PutMapping("/positions")
    @PreAuthorize("hasAuthority('SCOPE_dashboard:write')")
    @Operation(summary = "Update widgets positions")
    public ResponseEntity<ApiResponse<?>> updateWidgetsPositions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<UUID, Integer> positions) {
        UUID userId = extractUserId(jwt);
        dashboardWidgetService.updateWidgetsPositions(userId, positions);
        return ResponseEntity.ok(
            ApiResponse.success("Widget positions updated", null)
        );
    }

    @GetMapping("/{widgetId}/data")
    @PreAuthorize("hasAuthority('SCOPE_dashboard:read')")
    @Operation(summary = "Get widget data")
    public ResponseEntity<ApiResponse<?>> getWidgetData(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID widgetId) {
        UUID userId = extractUserId(jwt);
        var widget = dashboardWidgetService.getWidget(userId, widgetId);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Widget data retrieved",
                dashboardWidgetService.getWidgetData(userId, widget.getWidgetType())
            )
        );
    }

    @PostMapping("/default")
    @PreAuthorize("hasAuthority('SCOPE_dashboard:write')")
    @Operation(summary = "Create default widgets")
    public ResponseEntity<ApiResponse<?>> createDefaultWidgets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        dashboardWidgetService.createDefaultWidgets(userId);
        return ResponseEntity.ok(
            ApiResponse.success("Default widgets created", null)
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
