package com.finapp.repositories.goal;

import com.finapp.models.goal.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GoalRepository extends JpaRepository<Goal, UUID> {
    
    List<Goal> findByUserId(UUID userId);
    
    Optional<Goal> findByIdAndUserId(UUID id, UUID userId);
    
    List<Goal> findByUserIdAndStatus(UUID userId, String status);
    
    List<Goal> findByUserIdAndGoalType(UUID userId, String goalType);
    
    List<Goal> findByUserIdAndPriority(UUID userId, Integer priority);
    
    List<Goal> findByUserIdAndDeadlineBefore(UUID userId, LocalDate date);
    
    List<Goal> findByUserIdAndDeadlineAfter(UUID userId, LocalDate date);
    
    @Query("SELECT g FROM Goal g WHERE g.userId = :userId " +
           "AND g.status = 'ACTIVE' " +
           "AND g.deadline BETWEEN :today AND :futureDate")
    List<Goal> findGoalsWithApproachingDeadline(
        @Param("userId") UUID userId,
        @Param("today") LocalDate today,
        @Param("futureDate") LocalDate futureDate
    );
    
    @Query("UPDATE Goal g SET g.currentAmount = g.currentAmount + :amount " +
           "WHERE g.id = :goalId AND g.userId = :userId")
    void addToCurrentAmount(
        @Param("goalId") UUID goalId,
        @Param("userId") UUID userId,
        @Param("amount") Double amount
    );
    
    @Query("SELECT (g.currentAmount / g.targetAmount * 100) FROM Goal g " +
           "WHERE g.id = :goalId AND g.userId = :userId")
    Double getGoalProgressPercentage(
        @Param("goalId") UUID goalId,
        @Param("userId") UUID userId
    );
}
