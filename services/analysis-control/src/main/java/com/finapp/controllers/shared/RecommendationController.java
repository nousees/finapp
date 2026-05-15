package com.finapp.controllers.shared;

import com.finapp.controllers.ApiResponse;
import com.finapp.security.JwtUserIdExtractor;
import com.finapp.services.shared.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommendations", description = "API for working with recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_recommendations:read')")
    @Operation(summary = "Get all user recommendations")
    public ResponseEntity<ApiResponse<?>> getUserRecommendations(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Recommendations retrieved",
                recommendationService.getUserRecommendations(userId)
            )
        );
    }

    @GetMapping("/unapplied")
    @PreAuthorize("hasAuthority('SCOPE_recommendations:read')")
    @Operation(summary = "Get unapplied recommendations")
    public ResponseEntity<ApiResponse<?>> getUnappliedRecommendations(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Unapplied recommendations retrieved",
                recommendationService.getUnappliedRecommendations(userId)
            )
        );
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAuthority('SCOPE_recommendations:write')")
    @Operation(summary = "Generate recommendations")
    public ResponseEntity<ApiResponse<?>> generateRecommendations(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Recommendations generated",
                recommendationService.generateRecommendations(userId)
            )
        );
    }

    @PostMapping("/{recommendationId}/apply")
    @PreAuthorize("hasAuthority('SCOPE_recommendations:write')")
    @Operation(summary = "Apply recommendation")
    public ResponseEntity<ApiResponse<?>> markAsApplied(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID recommendationId) {
        UUID userId = extractUserId(jwt);
        recommendationService.markAsApplied(userId, recommendationId);
        return ResponseEntity.ok(
            ApiResponse.success("Recommendation applied", null)
        );
    }

    @DeleteMapping("/{recommendationId}")
    @PreAuthorize("hasAuthority('SCOPE_recommendations:write')")
    @Operation(summary = "Delete recommendation")
    public ResponseEntity<ApiResponse<?>> deleteRecommendation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID recommendationId) {
        UUID userId = extractUserId(jwt);
        recommendationService.deleteRecommendation(userId, recommendationId);
        return ResponseEntity.ok(
            ApiResponse.success("Recommendation deleted", null)
        );
    }

    @GetMapping("/potential-savings")
    @PreAuthorize("hasAuthority('SCOPE_recommendations:read')")
    @Operation(summary = "Get total potential savings")
    public ResponseEntity<ApiResponse<?>> getTotalPotentialSavings(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = extractUserId(jwt);
        return ResponseEntity.ok(
            ApiResponse.success(
                "Potential savings calculated",
                Map.of("potentialSavings", recommendationService.getTotalPotentialSavings(userId))
            )
        );
    }

    private UUID extractUserId(Jwt jwt) {
        return JwtUserIdExtractor.extractUserId(jwt);
    }
}
