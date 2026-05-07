package com.finapp.repositories.goal;

import com.finapp.models.goal.GoalTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface GoalTransactionRepository extends JpaRepository<GoalTransaction, UUID> {
    
    List<GoalTransaction> findByGoalId(UUID goalId);
    
    List<GoalTransaction> findByGoalIdAndDate(UUID goalId, LocalDate date);
    
    List<GoalTransaction> findByGoalIdAndDateBetween(
        UUID goalId, LocalDate startDate, LocalDate endDate);
    
    List<GoalTransaction> findByGoalIdAndIsAutoSaveTrue(UUID goalId);
    
    @Query("SELECT gt FROM GoalTransaction gt " +
           "JOIN Goal g ON gt.goal.id = g.id " +
           "WHERE g.userId = :userId")
    List<GoalTransaction> findByUserId(@Param("userId") UUID userId);
    
    @Query("SELECT COALESCE(SUM(gt.amount), 0) FROM GoalTransaction gt " +
           "WHERE gt.goal.id = :goalId")
    Double getTotalAmountByGoalId(@Param("goalId") UUID goalId);
    
    List<GoalTransaction> findTop5ByGoalIdOrderByDateDesc(UUID goalId);
}
