package com.finapp.services.goal;

import com.finapp.models.goal.Goal;
import com.finapp.models.goal.GoalTransaction;
import com.finapp.repositories.goal.GoalRepository;
import com.finapp.repositories.goal.GoalTransactionRepository;
import com.finapp.services.exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.Map;
import lombok.Data;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoalTransactionService {
    
    private final GoalTransactionRepository goalTransactionRepository;
    private final GoalRepository goalRepository;
    private final GoalService goalService;
    
    public List<GoalTransaction> getGoalTransactions(UUID userId, UUID goalId) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
            .orElseThrow(() -> new NotFoundException("Goal", goalId));
        
        return goalTransactionRepository.findByGoalId(goalId);
    }
    
    @Transactional
    public GoalTransaction createGoalTransaction(UUID userId, UUID goalId, BigDecimal amount, 
                                                Boolean isAutoSave, UUID transactionId) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
            .orElseThrow(() -> new NotFoundException("Goal", goalId));
        
        GoalTransaction goalTransaction = new GoalTransaction();
        goalTransaction.setGoal(goal);
        goalTransaction.setAmount(amount);
        goalTransaction.setDate(LocalDate.now());
        goalTransaction.setIsAutoSave(isAutoSave != null ? isAutoSave : false);
        goalTransaction.setTransactionId(transactionId);
        
        goalService.addToGoal(userId, goalId, amount);
        
        return goalTransactionRepository.save(goalTransaction);
    }
    
    public GoalTransactionStats getGoalTransactionStats(UUID userId, UUID goalId) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
            .orElseThrow(() -> new NotFoundException("Goal", goalId));
        
        List<GoalTransaction> transactions = goalTransactionRepository.findByGoalId(goalId);
        
        GoalTransactionStats stats = new GoalTransactionStats();
        stats.setTotalTransactions(transactions.size());
        stats.setTotalAmount(transactions.stream()
            .map(GoalTransaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add));
        stats.setAutoSaveCount(transactions.stream()
            .filter(GoalTransaction::getIsAutoSave)
            .count());
        
        return stats;
    }
    
    @Data
    public static class GoalTransactionStats {
        private Integer totalTransactions;
        private BigDecimal totalAmount;
        private Long autoSaveCount;
        private LocalDate firstTransactionDate;
        private LocalDate lastTransactionDate;
    }
}