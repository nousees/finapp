package com.finapp.controllers.shared;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.shared.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "API for working with notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_notifications:read')")
    @Operation(summary = "Get user notifications")
    public ResponseEntity<ApiResponse<?>> getUserNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        UUID userId = extractUserId(jwt);
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equals(sortParams[1])
            ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));

        return ResponseEntity.ok(
            ApiResponse.success(
                "Notifications retrieved",
                notificationService.getUserNotifications(userId, pageable)
            )
        );
    }

    @GetMapping("/unread")
    @PreAuthorize("hasAuthority('SCOPE_notifications:read')")
    @Operation(summary = "Get unread notifications")
    public ResponseEntity<ApiResponse<?>> getUnreadNotifications(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Unread notifications retrieved",
                notificationService.getUnreadNotifications(userId)
            )
        );
    }

    @GetMapping("/unread/count")
    @PreAuthorize("hasAuthority('SCOPE_notifications:read')")
    @Operation(summary = "Get unread notifications count")
    public ResponseEntity<ApiResponse<?>> getUnreadCount(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Unread notifications count retrieved",
                Map.of("count", notificationService.getUnreadCount(userId))
            )
        );
    }

    @PostMapping("/mark-read")
    @PreAuthorize("hasAuthority('SCOPE_notifications:write')")
    @Operation(summary = "Mark notifications as read")
    public ResponseEntity<ApiResponse<?>> markAsRead(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) List<UUID> notificationIds) {
        UUID userId = extractUserId(jwt);
        notificationService.markAsRead(userId, notificationIds);
        return ResponseEntity.ok(
            ApiResponse.success("Notifications marked as read", null)
        );
    }

    @DeleteMapping("/cleanup")
    @PreAuthorize("hasAuthority('SCOPE_notifications:write')")
    @Operation(summary = "Clean up old notifications")
    public ResponseEntity<ApiResponse<?>> cleanupOldNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "30") int daysToKeep) {
        UUID userId = extractUserId(jwt);
        notificationService.cleanupOldNotifications(userId, daysToKeep);
        return ResponseEntity.ok(
            ApiResponse.success("Old notifications cleaned up", null)
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
