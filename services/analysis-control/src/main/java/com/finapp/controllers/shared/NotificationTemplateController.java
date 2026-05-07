package com.finapp.controllers.shared;

import com.finapp.controllers.ApiResponse;
import com.finapp.services.shared.NotificationTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notification-templates")
@RequiredArgsConstructor
@Tag(name = "Notification Templates", description = "API for managing notification templates")
public class NotificationTemplateController {

    private final NotificationTemplateService notificationTemplateService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_notification_templates:read')")
    @Operation(summary = "Get all templates")
    public ResponseEntity<ApiResponse<?>> getAllTemplates() {
        return ResponseEntity.ok(
            ApiResponse.success(
                "Templates retrieved",
                notificationTemplateService.getAllTemplates()
            )
        );
    }

    @GetMapping("/{templateId}")
    @PreAuthorize("hasAuthority('SCOPE_notification_templates:read')")
    @Operation(summary = "Get template by ID")
    public ResponseEntity<ApiResponse<?>> getTemplate(@PathVariable UUID templateId) {
        return ResponseEntity.ok(
            ApiResponse.success(
                "Template found",
                notificationTemplateService.getTemplate(templateId)
            )
        );
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAuthority('SCOPE_notification_templates:read')")
    @Operation(summary = "Get template by type")
    public ResponseEntity<ApiResponse<?>> getTemplateByType(@PathVariable String type) {
        return ResponseEntity.ok(
            ApiResponse.success(
                "Template by type found",
                notificationTemplateService.getTemplateByType(type)
            )
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_notification_templates:write')")
    @Operation(summary = "Create template")
    public ResponseEntity<ApiResponse<?>> createTemplate(
            @RequestParam String type,
            @RequestParam String titleTemplate,
            @RequestParam String messageTemplate,
            @RequestBody(required = false) Map<String, Object> conditions,
            @RequestParam(required = false) Integer priority) {
        return ResponseEntity.ok(
            ApiResponse.success(
                "Template created successfully",
                notificationTemplateService.createTemplate(type, titleTemplate, messageTemplate, conditions, priority)
            )
        );
    }
}
