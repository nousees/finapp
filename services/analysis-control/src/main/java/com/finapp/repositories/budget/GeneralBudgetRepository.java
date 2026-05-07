package com.finapp.repositories.budget;

import com.finapp.models.budget.GeneralBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GeneralBudgetRepository extends JpaRepository<GeneralBudget, UUID> {
    
    List<GeneralBudget> findByUserId(UUID userId);
    
    Optional<GeneralBudget> findByIdAndUserId(UUID id, UUID userId);
    
    List<GeneralBudget> findByUserIdAndPeriod(UUID userId, String period);
    
    @Query("SELECT gb FROM GeneralBudget gb WHERE gb.userId = :userId " +
           "AND gb.periodStart <= :date " +
           "AND gb.periodEnd >= :date " +
           "ORDER BY gb.periodStart DESC")
    List<GeneralBudget> findActiveGeneralBudgetsByDate(
        @Param("userId") UUID userId, 
        @Param("date") LocalDate date
    );
    
    @Query("UPDATE GeneralBudget gb SET gb.spentAmount = gb.spentAmount + :amount " +
           "WHERE gb.id = :budgetId AND gb.userId = :userId")
    void addToSpentAmount(
        @Param("budgetId") UUID budgetId,
        @Param("userId") UUID userId,
        @Param("amount") Double amount
    );
}
