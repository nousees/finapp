package com.finapp.services.shared;

import com.finapp.analysis.dto.RecommendationCandidate;
import com.finapp.analysis.model.FinancialAnalysisFacade;
import com.finapp.models.shared.Recommendation;
import com.finapp.repositories.shared.RecommendationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final ObjectMapper objectMapper;
    private final FinancialAnalysisFacade financialAnalysisFacade;
    private final NotificationService notificationService;

    public List<Recommendation> getUserRecommendations(UUID userId) {
        return recommendationRepository.findByUserIdAndIsAppliedFalseOrderByPriorityAscCreatedAtDesc(userId);
    }

    public List<Recommendation> getUnappliedRecommendations(UUID userId) {
        return recommendationRepository.findByUserIdAndIsAppliedFalseOrderByPriorityAscCreatedAtDesc(userId);
    }

    public List<Recommendation> getRecommendationsByPriority(UUID userId, Integer priority) {
        return recommendationRepository.findByUserIdAndPriority(userId, priority);
    }

    @Transactional
    public Recommendation createRecommendation(
            UUID userId,
            String type,
            String title,
            String description,
            List<String> actionItems,
            BigDecimal estimatedSavings,
            Integer priority) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(userId);
        recommendation.setType(type);
        recommendation.setTitle(title);
        recommendation.setDescription(description);

        if (actionItems != null) {
            try {
                recommendation.setActionItems(objectMapper.writeValueAsString(actionItems));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error converting actionItems to JSON", e);
            }
        }

        recommendation.setEstimatedSavings(estimatedSavings);
        recommendation.setPriority(priority != null ? priority : 1);

        return recommendationRepository.save(recommendation);
    }

    @Transactional
    public void markAsApplied(UUID userId, UUID recommendationId) {
        Recommendation recommendation = recommendationRepository.findById(recommendationId)
            .filter(r -> r.getUserId().equals(userId))
            .orElseThrow(() -> new RuntimeException("Recommendation not found"));

        if (!recommendation.getIsApplied()) {
            recommendation.setIsApplied(true);
            recommendation.setAppliedAt(new Date().toInstant().atOffset(java.time.ZoneOffset.UTC));
            recommendationRepository.save(recommendation);
            log.info("Recommendation {} marked as applied", recommendationId);
        }
    }

    @Transactional
    public void deleteRecommendation(UUID userId, UUID recommendationId) {
        Recommendation recommendation = recommendationRepository.findById(recommendationId)
            .filter(r -> r.getUserId().equals(userId))
            .orElseThrow(() -> new RuntimeException("Recommendation not found"));
        recommendationRepository.delete(recommendation);
    }

    @Transactional
    public List<Recommendation> generateRecommendations(UUID userId) {
        log.info("Generating financial insight recommendations for user: {}", userId);

        List<RecommendationCandidate> candidates = financialAnalysisFacade.analyzeCurrentMonth(userId).recommendations();
        recommendationRepository.findByUserIdAndIsAppliedFalse(userId).forEach(recommendationRepository::delete);
        if (candidates.isEmpty()) {
            return List.of();
        }

        List<Recommendation> recommendations = candidates.stream()
            .map(candidate -> toRecommendation(userId, candidate))
            .collect(Collectors.toList());

        List<Recommendation> savedRecommendations = recommendationRepository.saveAll(recommendations);
        createRecommendationNotifications(userId, candidates, savedRecommendations);
        return savedRecommendations;
    }

    private Recommendation toRecommendation(UUID userId, RecommendationCandidate candidate) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(userId);
        recommendation.setType(candidate.type());
        recommendation.setTitle(candidate.title());
        recommendation.setDescription(candidate.description());
        recommendation.setEstimatedSavings(candidate.estimatedSavings());
        recommendation.setPriority(candidate.priority());

        try {
            recommendation.setActionItems(objectMapper.writeValueAsString(candidate.actionItems()));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error converting actionItems to JSON", e);
        }

        return recommendation;
    }

    private void createRecommendationNotifications(
            UUID userId,
            List<RecommendationCandidate> candidates,
            List<Recommendation> savedRecommendations) {
        for (int i = 0; i < candidates.size() && i < savedRecommendations.size(); i++) {
            RecommendationCandidate candidate = candidates.get(i);
            Recommendation savedRecommendation = savedRecommendations.get(i);
            if (!candidate.shouldNotify()) {
                continue;
            }

            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("recommendationType", candidate.type());
            notificationData.put("priority", candidate.priority());
            notificationData.put("estimatedSavings", candidate.estimatedSavings());
            notificationData.put("sourceModel", candidate.sourceModel());
            if (candidate.entityType() != null) {
                notificationData.put("sourceEntityType", candidate.entityType());
            }
            if (candidate.entityId() != null) {
                notificationData.put("sourceEntityId", candidate.entityId());
            }

            notificationService.createNotification(
                userId,
                "RECOMMENDATION",
                candidate.title(),
                candidate.description(),
                "JAVA",
                "recommendation",
                savedRecommendation.getId(),
                notificationData
            );
        }
    }

    public BigDecimal getTotalPotentialSavings(UUID userId) {
        Double savings = recommendationRepository.getTotalPotentialSavings(userId);
        return savings != null ? BigDecimal.valueOf(savings) : BigDecimal.ZERO;
    }

    public List<Recommendation> getTopSavingsRecommendations(UUID userId, int limit) {
        List<Recommendation> recommendations = recommendationRepository.findTopRecommendationsBySavings(userId);

        return recommendations.stream()
            .limit(limit)
            .collect(Collectors.toList());
    }

    @Transactional
    public void cleanupOldRecommendations(UUID userId, int daysToKeep) {
        log.info("Cleaning up old recommendations for user: {}", userId);
    }
}
