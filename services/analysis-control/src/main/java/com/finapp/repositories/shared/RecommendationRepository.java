package com.finapp.repositories.shared;

import com.finapp.models.shared.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface RecommendationRepository extends JpaRepository<Recommendation, UUID> {
    
    List<Recommendation> findByUserId(UUID userId);
    
    List<Recommendation> findByUserIdAndIsAppliedFalse(UUID userId);
    
    List<Recommendation> findByUserIdAndType(UUID userId, String type);
    
    List<Recommendation> findByUserIdAndPriority(UUID userId, Integer priority);
    
    @Query("SELECT r FROM Recommendation r WHERE r.userId = :userId " +
           "AND r.isApplied = false " +
           "ORDER BY r.estimatedSavings DESC")
    List<Recommendation> findTopRecommendationsBySavings(@Param("userId") UUID userId);
    
    @Query("SELECT COALESCE(SUM(r.estimatedSavings), 0) FROM Recommendation r " +
           "WHERE r.userId = :userId AND r.isApplied = false")
    Double getTotalPotentialSavings(@Param("userId") UUID userId);
    
    @Modifying
    @Query("UPDATE Recommendation r SET r.isApplied = true, r.appliedAt = :appliedAt " +
           "WHERE r.id = :id AND r.userId = :userId")
    void markAsApplied(@Param("id") UUID id, @Param("userId") UUID userId, @Param("appliedAt") OffsetDateTime appliedAt);
}
