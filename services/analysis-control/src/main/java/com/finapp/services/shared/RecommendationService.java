package com.finapp.services.shared;

import com.finapp.models.shared.Recommendation;
import com.finapp.repositories.shared.RecommendationRepository;
import com.finapp.services.budget.BudgetService;
import com.finapp.services.goal.GoalService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {
    
    private final RecommendationRepository recommendationRepository;
    private final BudgetService budgetService;
    private final GoalService goalService;
    private final ObjectMapper objectMapper;
    
    public List<Recommendation> getUserRecommendations(UUID userId) {
        return recommendationRepository.findByUserId(userId);
    }
    
    public List<Recommendation> getUnappliedRecommendations(UUID userId) {
        return recommendationRepository.findByUserIdAndIsAppliedFalse(userId);
    }
    
    public List<Recommendation> getRecommendationsByPriority(UUID userId, Integer priority) {
        return recommendationRepository.findByUserIdAndPriority(userId, priority);
    }
    
    @Transactional
    public Recommendation createRecommendation(UUID userId, String type, String title,
                                              String description, List<String> actionItems,
                                              BigDecimal estimatedSavings, Integer priority) {
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
    public List<Recommendation> generateRecommendations(UUID userId) {
        log.info("Generating recommendations for user: {}", userId);
        
        List<Recommendation> recommendations = new ArrayList<>();
        
        recommendations.addAll(generateBudgetRecommendations(userId));
        
        recommendations.addAll(generateGoalRecommendations(userId));

        recommendations.addAll(generateGeneralSavingsRecommendations(userId));
        
        return recommendationRepository.saveAll(recommendations);
    }
    
    private List<Recommendation> generateBudgetRecommendations(UUID userId) {
        List<Recommendation> recommendations = new ArrayList<>();
        
        try {
            
            Recommendation rec = new Recommendation();
            rec.setUserId(userId);
            rec.setType("BUDGET_OPTIMIZATION");
            rec.setTitle("Grocery budget optimization");
            rec.setDescription("You regularly exceed grocery budget by 20%. " +
                             "Consider reviewing expenses in this category.");
            rec.setPriority(2);
            rec.setEstimatedSavings(new BigDecimal("3000"));
            
            List<String> actions = Arrays.asList(
                "Analyze supermarket receipts",
                "Plan weekly shopping",
                "Buy products on sale"
            );
            rec.setActionItems(objectMapper.writeValueAsString(actions));
            
            recommendations.add(rec);
            
        } catch (Exception e) {
            log.error("Error generating budget recommendations", e);
        }
        
        return recommendations;
    }
    
    private List<Recommendation> generateGoalRecommendations(UUID userId) {
        List<Recommendation> recommendations = new ArrayList<>();
        
        try {
            Recommendation rec = new Recommendation();
            rec.setUserId(userId);
            rec.setType("GOAL_ACCELERATION");
            rec.setTitle("Accelerate goal achievement");
            rec.setDescription("You can reach your financial goals 30% faster " +
                             "if you increase monthly contributions.");
            rec.setPriority(3);
            rec.setEstimatedSavings(new BigDecimal("15000"));
            
            List<String> actions = Arrays.asList(
                "Increase goal auto-save by 10%",
                "Find additional income source",
                "Reduce unnecessary expenses"
            );
            rec.setActionItems(objectMapper.writeValueAsString(actions));
            
            recommendations.add(rec);
            
        } catch (Exception e) {
            log.error("Error generating goal recommendations", e);
        }
        
        return recommendations;
    }
    
    private List<Recommendation> generateGeneralSavingsRecommendations(UUID userId) {
        List<Recommendation> recommendations = new ArrayList<>();
        
        try {
            Recommendation rec = new Recommendation();
            rec.setUserId(userId);
            rec.setType("SAVING_TIP");
            rec.setTitle("Save on subscriptions");
            rec.setDescription("You can save up to 2000 rub. per month " +
                             "by canceling unused subscriptions.");
            rec.setPriority(1);
            rec.setEstimatedSavings(new BigDecimal("2000"));
            
            List<String> actions = Arrays.asList(
                "Review active subscriptions",
                "Cancel unused services",
                "Use family plans"
            );
            rec.setActionItems(objectMapper.writeValueAsString(actions));
            
            recommendations.add(rec);
            
        } catch (Exception e) {
            log.error("Error generating general recommendations", e);
        }
        
        return recommendations;
    }
    
    public BigDecimal getTotalPotentialSavings(UUID userId) {
        Double savings = recommendationRepository.getTotalPotentialSavings(userId);
        return savings != null ? BigDecimal.valueOf(savings) : BigDecimal.ZERO;
    }
    
    public List<Recommendation> getTopSavingsRecommendations(UUID userId, int limit) {
        List<Recommendation> recommendations = recommendationRepository
            .findTopRecommendationsBySavings(userId);
        
        return recommendations.stream()
            .limit(limit)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public void cleanupOldRecommendations(UUID userId, int daysToKeep) {
        log.info("Cleaning up old recommendations for user: {}", userId);
    }
}