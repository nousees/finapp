package com.finapp.repositories.budget;

import com.finapp.models.budget.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    
    List<Budget> findByUserId(UUID userId);
    
    List<Budget> findByUserIdAndIsActiveTrue(UUID userId);
    
    Optional<Budget> findByIdAndUserId(UUID id, UUID userId);
    
    List<Budget> findByUserIdAndCategoryId(UUID userId, UUID categoryId);
    
    List<Budget> findByUserIdAndPeriod(UUID userId, String period);
    
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId " +
           "AND b.isActive = true " +
           "AND b.periodStart <= :date " +
           "AND b.periodEnd >= :date")
    List<Budget> findActiveBudgetsByDate(
        @Param("userId") UUID userId, 
        @Param("date") LocalDate date
    );
    
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId " +
           "AND b.isActive = true " +
           "AND (b.spentAmount / b.amountLimit * 100) >= :percent")
    List<Budget> findBudgetsExceedingPercentage(
        @Param("userId") UUID userId, 
        @Param("percent") double percent
    );
    
    @Query("UPDATE Budget b SET b.spentAmount = b.spentAmount + :amount " +
           "WHERE b.id = :budgetId AND b.userId = :userId")
    void addToSpentAmount(
        @Param("budgetId") UUID budgetId,
        @Param("userId") UUID userId,
        @Param("amount") Double amount
    );
    
    void deleteByIdAndUserId(UUID id, UUID userId);
}
