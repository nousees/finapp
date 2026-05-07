package com.finapp.controllers.goal;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.dtos.GoalDTO;
import com.finapp.services.goal.GoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
@Tag(name = "Financial Goals", description = "API for managing financial goals")
public class GoalController {

    private final GoalService goalService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_goals:read')")
    @Operation(summary = "Get all user goals")
    public ResponseEntity<ApiResponse<?>> getUserGoals(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Goals retrieved successfully",
                goalService.getUserGoals(userId)
            )
        );
    }

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('SCOPE_goals:read')")
    @Operation(summary = "Get active goals")
    public ResponseEntity<ApiResponse<?>> getActiveGoals(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Active goals retrieved",
                goalService.getActiveGoals(userId)
            )
        );
    }

    @GetMapping("/{goalId}")
    @PreAuthorize("hasAuthority('SCOPE_goals:read')")
    @Operation(summary = "Get goal by ID")
    public ResponseEntity<ApiResponse<?>> getGoal(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Goal found",
                goalService.getGoal(userId, goalId)
            )
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_goals:write')")
    @Operation(summary = "Create new goal")
    public ResponseEntity<ApiResponse<?>> createGoal(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody GoalDTO goalDTO) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(
                "Goal created successfully",
                goalService.createGoal(userId, goalDTO)
            ));
    }

    @PutMapping("/{goalId}")
    @PreAuthorize("hasAuthority('SCOPE_goals:write')")
    @Operation(summary = "Update goal")
    public ResponseEntity<ApiResponse<?>> updateGoal(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId,
            @Valid @RequestBody GoalDTO goalDTO) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Goal updated successfully",
                goalService.updateGoal(userId, goalId, goalDTO)
            )
        );
    }

    @DeleteMapping("/{goalId}")
    @PreAuthorize("hasAuthority('SCOPE_goals:write')")
    @Operation(summary = "Delete goal")
    public ResponseEntity<ApiResponse<?>> deleteGoal(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId) {
        UUID userId = extractUserId(jwt);
        goalService.deleteGoal(userId, goalId);
        return ResponseEntity.ok(
            ApiResponse.success("Goal deleted successfully", null)
        );
    }

    @PostMapping("/{goalId}/add")
    @PreAuthorize("hasAuthority('SCOPE_goals:write')")
    @Operation(summary = "Add funds to goal")
    public ResponseEntity<ApiResponse<?>> addToGoal(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId,
            @RequestParam BigDecimal amount) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Funds successfully added to goal",
                goalService.addToGoal(userId, goalId, amount)
            )
        );
    }

    @GetMapping("/{goalId}/progress")
    @PreAuthorize("hasAuthority('SCOPE_goals:read')")
    @Operation(summary = "Get goal progress")
    public ResponseEntity<ApiResponse<?>> getGoalProgress(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Goal progress retrieved",
                goalService.getGoalProgress(userId, goalId)
            )
        );
    }

    @GetMapping("/deadline/approaching")
    @PreAuthorize("hasAuthority('SCOPE_goals:read')")
    @Operation(summary = "Get goals with approaching deadline")
    public ResponseEntity<ApiResponse<?>> getGoalsWithApproachingDeadline(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "7") int daysAhead) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Goals with approaching deadline retrieved",
                goalService.getGoalsWithApproachingDeadline(userId, daysAhead)
            )
        );
    }

    @PostMapping("/auto-save/process")
    @PreAuthorize("hasAuthority('SCOPE_goals:write')")
    @Operation(summary = "Execute auto-save for goals")
    public ResponseEntity<ApiResponse<?>> processAutoSavings(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        goalService.processAutoSavings(userId);
        return ResponseEntity.ok(
            ApiResponse.success("Auto-save executed", null)
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
