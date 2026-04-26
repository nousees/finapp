package com.finapp.services.goal;

import com.finapp.models.goal.Goal;
import com.finapp.models.enums.GoalStatus;
import com.finapp.repositories.goal.GoalRepository;
import com.finapp.services.dtos.GoalDTO;
import com.finapp.services.exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoalService {
    
    private final GoalRepository goalRepository;
    
    public List<Goal> getUserGoals(UUID userId) {
        return goalRepository.findByUserId(userId);
    }
    
    public List<Goal> getActiveGoals(UUID userId) {
        return goalRepository.findByUserIdAndStatus(userId, GoalStatus.ACTIVE.toString());
    }
    
    public Goal getGoal(UUID userId, UUID goalId) {
        return goalRepository.findByIdAndUserId(goalId, userId)
            .orElseThrow(() -> new NotFoundException("Goal", goalId));
    }
    
    @Transactional
    public Goal createGoal(UUID userId, GoalDTO goalDTO) {
        Goal goal = new Goal();
        goal.setUserId(userId);
        goal.setName(goalDTO.getName());
        goal.setDescription(goalDTO.getDescription());
        goal.setTargetAmount(goalDTO.getTargetAmount());
        goal.setDeadline(goalDTO.getDeadline());
        goal.setGoalType(goalDTO.getGoalType());
        goal.setPriority(goalDTO.getPriority());
        goal.setAutoSaveAmount(goalDTO.getAutoSaveAmount());
        goal.setAutoSaveFrequency(goalDTO.getAutoSaveFrequency());
        goal.setIcon(goalDTO.getIcon());
        goal.setColor(goalDTO.getColor());
        goal.setCurrency(goalDTO.getCurrency());
        goal.setStatus(GoalStatus.ACTIVE.toString());
        
        return goalRepository.save(goal);
    }
    
    public GoalDTO updateGoal(UUID userId, UUID goalId, GoalDTO goalDTO) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
            .orElseThrow(() -> new NotFoundException("Goal", goalId));
        
        if (goalDTO.getName() != null) goal.setName(goalDTO.getName());
        if (goalDTO.getDescription() != null) goal.setDescription(goalDTO.getDescription());
        if (goalDTO.getTargetAmount() != null) goal.setTargetAmount(goalDTO.getTargetAmount());
        if (goalDTO.getDeadline() != null) goal.setDeadline(goalDTO.getDeadline());
        if (goalDTO.getCurrency() != null) goal.setCurrency(goalDTO.getCurrency());
        if (goalDTO.getGoalType() != null) goal.setGoalType(goalDTO.getGoalType());
        if (goalDTO.getPriority() != null) goal.setPriority(goalDTO.getPriority());
        if (goalDTO.getAutoSaveAmount() != null) goal.setAutoSaveAmount(goalDTO.getAutoSaveAmount());
        if (goalDTO.getAutoSaveFrequency() != null) goal.setAutoSaveFrequency(goalDTO.getAutoSaveFrequency());
        if (goalDTO.getIcon() != null) goal.setIcon(goalDTO.getIcon());
        if (goalDTO.getColor() != null) goal.setColor(goalDTO.getColor());
        
        Goal updated = goalRepository.save(goal);
        return convertToDTO(updated);
    }

    public void deleteGoal(UUID userId, UUID goalId) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, userId)
            .orElseThrow(() -> new NotFoundException("Goal", goalId));
        goalRepository.delete(goal);
    }

    @Transactional
    public Goal addToGoal(UUID userId, UUID goalId, BigDecimal amount) {
        Goal goal = getGoal(userId, goalId);
        BigDecimal newAmount = goal.getCurrentAmount().add(amount);
        
        if (newAmount.compareTo(goal.getTargetAmount()) >= 0) {
            goal.setCurrentAmount(goal.getTargetAmount());
            goal.setStatus(GoalStatus.COMPLETED.toString());
            log.info("Goal {} achieved by user {}", goalId, userId);
        } else {
            goal.setCurrentAmount(newAmount);
        }
        
        return goalRepository.save(goal);
    }
    
    public BigDecimal getGoalProgress(UUID userId, UUID goalId) {
        Goal goal = getGoal(userId, goalId);
        
        if (goal.getTargetAmount().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        
        return goal.getCurrentAmount()
            .divide(goal.getTargetAmount(), 2, java.math.RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));
    }

    public List<Goal> getGoalsWithApproachingDeadline(UUID userId, int daysAhead) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(daysAhead);
        
        return goalRepository.findGoalsWithApproachingDeadline(userId, today, futureDate);
    }
    
    @Transactional
    public void processAutoSavings(UUID userId) {
        List<Goal> goals = goalRepository.findByUserIdAndStatus(userId, GoalStatus.ACTIVE.toString());
        
        for (Goal goal : goals) {
            if (goal.getAutoSaveAmount() != null && goal.getAutoSaveFrequency() != null) {
                addToGoal(userId, goal.getId(), goal.getAutoSaveAmount());
                log.info("Auto-save for goal {} with amount {}", goal.getId(), goal.getAutoSaveAmount());
            }
        }
    }
    
    private GoalDTO convertToDTO(Goal goal) {
        GoalDTO dto = new GoalDTO();
        dto.setName(goal.getName());
        dto.setDescription(goal.getDescription());
        dto.setTargetAmount(goal.getTargetAmount());
        dto.setDeadline(goal.getDeadline());
        dto.setGoalType(goal.getGoalType());
        dto.setPriority(goal.getPriority());
        dto.setAutoSaveAmount(goal.getAutoSaveAmount());
        dto.setAutoSaveFrequency(goal.getAutoSaveFrequency());
        dto.setIcon(goal.getIcon());
        dto.setColor(goal.getColor());
        dto.setCurrency(goal.getCurrency());
        return dto;
    }
}