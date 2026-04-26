package com.finapp.controllers.goal;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.goal.GoalTransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/goals/{goalId}/transactions")
@RequiredArgsConstructor
@Tag(name = "Goal Transactions", description = "API for managing goal contributions")
public class GoalTransactionController {

    private final GoalTransactionService goalTransactionService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_goals:read')")
    @Operation(summary = "Get all goal transactions")
    public ResponseEntity<ApiResponse<?>> getGoalTransactions(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Goal transactions retrieved",
                goalTransactionService.getGoalTransactions(userId, goalId)
            )
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_goals:write')")
    @Operation(summary = "Create transaction for goal")
    public ResponseEntity<ApiResponse<?>> createGoalTransaction(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false) Boolean isAutoSave,
            @RequestParam(required = false) UUID transactionId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Transaction created successfully",
                goalTransactionService.createGoalTransaction(userId, goalId, amount, isAutoSave, transactionId)
            )
        );
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('SCOPE_goals:read')")
    @Operation(summary = "Get goal contribution statistics")
    public ResponseEntity<ApiResponse<?>> getGoalTransactionStats(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID goalId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Statistics retrieved",
                goalTransactionService.getGoalTransactionStats(userId, goalId)
            )
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
