package com.finapp.services.shared;

import com.finapp.analysis.dto.RecommendationCandidate;
import com.finapp.analysis.model.FinancialAnalysisFacade;
import com.finapp.models.shared.Recommendation;
import com.finapp.models.shared.RecommendationEvent;
import com.finapp.repositories.shared.RecommendationEventRepository;
import com.finapp.repositories.shared.RecommendationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final String SUBSCRIPTION_RECOMMENDATION_TYPE = "subscription";
    private static final Set<String> ALLOWED_EVENT_TYPES = Set.of("SHOWN", "CLICKED", "APPLIED", "DISMISSED");

    private final RecommendationRepository recommendationRepository;
    private final RecommendationEventRepository recommendationEventRepository;
    private final ObjectMapper objectMapper;
    private final FinancialAnalysisFacade financialAnalysisFacade;
    private final NotificationService notificationService;

    public List<Recommendation> getUserRecommendations(UUID userId) {
        return rerank(recommendationRepository.findByUserIdAndIsAppliedFalse(userId));
    }

    public List<Recommendation> getUnappliedRecommendations(UUID userId) {
        List<Recommendation> existing = recommendationRepository.findByUserIdAndIsAppliedFalse(userId);
        if (!existing.isEmpty()) {
            return rerank(existing);
        }
        return rerank(generateRecommendations(userId));
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
            saveEvent(userId, recommendationId, "APPLIED");
            log.info("Recommendation {} marked as applied", recommendationId);
        }
    }

    @Transactional
    public void deleteRecommendation(UUID userId, UUID recommendationId) {
        Recommendation recommendation = recommendationRepository.findById(recommendationId)
            .filter(r -> r.getUserId().equals(userId))
            .orElseThrow(() -> new RuntimeException("Recommendation not found"));
        saveEvent(userId, recommendationId, "DISMISSED");
        recommendationRepository.delete(recommendation);
    }

    @Transactional
    public RecommendationEvent recordEvent(UUID userId, UUID recommendationId, String eventType) {
        recommendationRepository.findById(recommendationId)
            .filter(r -> r.getUserId().equals(userId))
            .orElseThrow(() -> new RuntimeException("Recommendation not found"));

        return saveEvent(userId, recommendationId, normalizeEventType(eventType));
    }

    @Transactional
    public List<Recommendation> generateRecommendations(UUID userId) {
        log.info("Generating financial insight recommendations for user: {}", userId);

        List<RecommendationCandidate> candidates = financialAnalysisFacade.analyzeCurrentMonth(userId).recommendations();
        recommendationRepository.findByUserIdAndIsAppliedFalse(userId).stream()
            .filter(recommendation -> !SUBSCRIPTION_RECOMMENDATION_TYPE.equalsIgnoreCase(recommendation.getType()))
            .forEach(recommendationRepository::delete);
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

    private RecommendationEvent saveEvent(UUID userId, UUID recommendationId, String eventType) {
        String normalizedType = normalizeEventType(eventType);
        RecommendationEvent event = new RecommendationEvent();
        event.setUserId(userId);
        event.setRecommendationId(recommendationId);
        event.setEventType(normalizedType);
        return recommendationEventRepository.save(event);
    }

    private String normalizeEventType(String eventType) {
        String normalizedType = eventType == null ? "" : eventType.trim().toUpperCase();
        if (!ALLOWED_EVENT_TYPES.contains(normalizedType)) {
            throw new RuntimeException("Unsupported recommendation event type: " + eventType);
        }
        return normalizedType;
    }

    private List<Recommendation> rerank(List<Recommendation> recommendations) {
        if (recommendations.isEmpty()) {
            return recommendations;
        }

        List<UUID> ids = recommendations.stream().map(Recommendation::getId).toList();
        Map<UUID, List<RecommendationEvent>> eventsByRecommendation = recommendationEventRepository
            .findByRecommendationIdIn(ids)
            .stream()
            .collect(Collectors.groupingBy(RecommendationEvent::getRecommendationId));

        return recommendations.stream()
            .sorted(Comparator
                .comparingDouble((Recommendation recommendation) -> scoreRecommendation(recommendation, eventsByRecommendation.getOrDefault(recommendation.getId(), List.of())))
                .reversed()
                .thenComparing(Recommendation::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }

    private double scoreRecommendation(Recommendation recommendation, List<RecommendationEvent> events) {
        double score = (recommendation.getPriority() != null ? recommendation.getPriority() : 1) * 10.0;
        if (recommendation.getEstimatedSavings() != null) {
            score += Math.min(5.0, recommendation.getEstimatedSavings().doubleValue() / 1000.0);
        }

        for (RecommendationEvent event : events) {
            switch (event.getEventType()) {
                case "CLICKED" -> score += 3.0;
                case "APPLIED" -> score += 6.0;
                case "DISMISSED" -> score -= 8.0;
                case "SHOWN" -> score -= 0.2;
                default -> {
                }
            }
        }
        return score;
    }

    @Transactional
    public void cleanupOldRecommendations(UUID userId, int daysToKeep) {
        log.info("Cleaning up old recommendations for user: {}", userId);
    }
}
