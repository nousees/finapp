package com.finapp.controllers.budget;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.budget.BudgetService;
import com.finapp.services.dtos.BudgetDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
@RequestMapping("/api/v1/budgets")
@RequiredArgsConstructor
@Tag(name = "Budgets", description = "API for managing category budgets")
public class BudgetController {

    private final BudgetService budgetService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_budgets:read')")
    @Operation(summary = "Get all user budgets",
               description = "Returns a list of all user budgets")
    public ResponseEntity<ApiResponse<?>> getUserBudgets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success("Budgets retrieved successfully", budgetService.getUserBudgets(userId))
        );
    }

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('SCOPE_budgets:read')")
    @Operation(summary = "Get active budgets",
               description = "Returns only active user budgets")
    public ResponseEntity<ApiResponse<?>> getActiveBudgets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success("Active budgets retrieved", budgetService.getActiveBudgets(userId))
        );
    }

    @GetMapping("/{budgetId}")
    @PreAuthorize("hasAuthority('SCOPE_budgets:read')")
    @Operation(summary = "Get budget by ID",
               description = "Returns a specific budget by its ID")
    public ResponseEntity<ApiResponse<?>> getBudget(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable @Parameter(description = "Budget ID") UUID budgetId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success("Budget found", budgetService.getBudget(userId, budgetId))
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_budgets:write')")
    @Operation(summary = "Create new budget",
               description = "Creates a new budget for the user")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Budget created successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<ApiResponse<?>> createBudget(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody @Parameter(description = "Budget creation data") BudgetDTO budgetDTO) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(
                "Budget created successfully",
                budgetService.createBudget(userId, budgetDTO)
            ));
    }

    @PutMapping("/{budgetId}")
    @PreAuthorize("hasAuthority('SCOPE_budgets:write')")
    @Operation(summary = "Update budget",
               description = "Updates an existing budget")
    public ResponseEntity<ApiResponse<?>> updateBudget(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable @Parameter(description = "Budget ID") UUID budgetId,
            @Valid @RequestBody @Parameter(description = "New budget data") BudgetDTO budgetDTO) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Budget updated successfully",
                budgetService.updateBudget(userId, budgetId, budgetDTO)
            )
        );
    }

    @DeleteMapping("/{budgetId}")
    @PreAuthorize("hasAuthority('SCOPE_budgets:write')")
    @Operation(summary = "Delete budget",
               description = "Deletes a budget by ID")
    public ResponseEntity<ApiResponse<?>> deleteBudget(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable @Parameter(description = "Budget ID") UUID budgetId) {
        UUID userId = extractUserId(jwt);
        budgetService.deleteBudget(userId, budgetId);
        return ResponseEntity.ok(
            ApiResponse.success("Budget deleted successfully", null)
        );
    }

    @GetMapping("/{budgetId}/progress")
    @PreAuthorize("hasAuthority('SCOPE_budgets:read')")
    @Operation(summary = "Get budget progress",
               description = "Returns budget progress in percentage")
    public ResponseEntity<ApiResponse<?>> getBudgetProgress(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable @Parameter(description = "Budget ID") UUID budgetId) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Budget progress retrieved",
                budgetService.getBudgetProgress(userId, budgetId)
            )
        );
    }

    @PostMapping("/{budgetId}/expense")
    @PreAuthorize("hasAuthority('SCOPE_budgets:write')")
    @Operation(summary = "Add expense to budget",
               description = "Adds expense amount to budget")
    public ResponseEntity<ApiResponse<?>> addExpenseToBudget(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable @Parameter(description = "Budget ID") UUID budgetId,
            @RequestParam @Parameter(description = "Expense amount") BigDecimal amount) {
        UUID userId = extractUserId(jwt);
        budgetService.addExpenseToBudget(userId, budgetId, amount);
        return ResponseEntity.ok(
            ApiResponse.success("Expense successfully added to budget", null)
        );
    }

    @GetMapping("/current")
    @PreAuthorize("hasAuthority('SCOPE_budgets:read')")
    @Operation(summary = "Get current budgets",
               description = "Returns budgets active on current date")
    public ResponseEntity<ApiResponse<?>> getCurrentBudgets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Current budgets retrieved",
                budgetService.getActiveBudgets(userId)
            )
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
