package com.finapp.controllers.budget;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.budget.GeneralBudgetService;
import com.finapp.services.dtos.GeneralBudgetDTO;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/general-budgets")
@RequiredArgsConstructor
@Tag(name = "General Budgets", description = "API for managing general budgets (without categories)")
public class GeneralBudgetController {

    private final GeneralBudgetService generalBudgetService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_budgets:read')")
    @Operation(summary = "Get all general budgets")
    public ResponseEntity<ApiResponse<?>> getUserGeneralBudgets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "General budgets retrieved",
                generalBudgetService.getUserGeneralBudgets(userId)
            )
        );
    }

    @GetMapping("/current")
    @PreAuthorize("hasAuthority('SCOPE_budgets:read')")
    @Operation(summary = "Get current general budget")
    public ResponseEntity<ApiResponse<?>> getCurrentGeneralBudget(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Current general budget retrieved",
                generalBudgetService.getCurrentGeneralBudget(userId)
            )
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_budgets:write')")
    @Operation(summary = "Create general budget")
    public ResponseEntity<ApiResponse<?>> createGeneralBudget(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody GeneralBudgetDTO dto) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(
                "General budget created successfully",
                generalBudgetService.createGeneralBudget(userId, dto)
            ));
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
