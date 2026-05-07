package com.finapp.services.budget;

import com.finapp.models.budget.GeneralBudget;
import com.finapp.repositories.budget.GeneralBudgetRepository;
import com.finapp.services.dtos.GeneralBudgetDTO;
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
public class GeneralBudgetService {
    
    private final GeneralBudgetRepository generalBudgetRepository;
    
    public List<GeneralBudget> getUserGeneralBudgets(UUID userId) {
        return generalBudgetRepository.findByUserId(userId);
    }
    
    public GeneralBudget getCurrentGeneralBudget(UUID userId) {
        List<GeneralBudget> activeBudgets = generalBudgetRepository.findActiveGeneralBudgetsByDate(userId, LocalDate.now());

        if (activeBudgets.isEmpty()) {
            throw new NotFoundException("Current general budget not found");
        }

        if (activeBudgets.size() > 1) {
            log.warn("Found {} active general budgets for user {}, returning most recent", activeBudgets.size(), userId);
        }

        return activeBudgets.get(0);
    }
    
    private GeneralBudgetDTO convertToDTO(GeneralBudget budget) {
        GeneralBudgetDTO dto = new GeneralBudgetDTO();
        dto.setId(budget.getId());
        dto.setUserId(budget.getUserId());
        dto.setTotalLimit(budget.getTotalLimit());
        dto.setSpentAmount(budget.getSpentAmount());
        dto.setPeriod(budget.getPeriod());
        dto.setPeriodStart(budget.getPeriodStart());
        dto.setPeriodEnd(budget.getPeriodEnd());
        // OffsetDateTime автоматически преобразуется в String при сериализации в JSON
        dto.setCreatedAt(budget.getCreatedAt());
        dto.setUpdatedAt(budget.getUpdatedAt());
        return dto;
    }

    @Transactional
    public GeneralBudgetDTO createGeneralBudget(UUID userId, GeneralBudgetDTO budgetDTO) {
        GeneralBudget budget = new GeneralBudget();
        budget.setUserId(userId);
        budget.setTotalLimit(budgetDTO.getTotalLimit());
        budget.setSpentAmount(BigDecimal.ZERO);
        budget.setPeriod(budgetDTO.getPeriod());
        budget.setPeriodStart(budgetDTO.getPeriodStart());
        budget.setPeriodEnd(budgetDTO.getPeriodEnd());
        // Не устанавливаем createdAt/updatedAt вручную - сделают @CreationTimestamp/@UpdateTimestamp
        
        GeneralBudget saved = generalBudgetRepository.save(budget);
        return convertToDTO(saved);
    }
    
    public BigDecimal getSpentAmount(UUID budgetId) {
        return generalBudgetRepository.findById(budgetId)
            .map(GeneralBudget::getSpentAmount)
            .orElse(BigDecimal.ZERO);
    }

    @Transactional
    public void addExpenseToGeneralBudget(UUID userId, BigDecimal amount) {
        try {
            GeneralBudget budget = getCurrentGeneralBudget(userId);
            BigDecimal newSpentAmount = budget.getSpentAmount().add(amount);
            budget.setSpentAmount(newSpentAmount);
            generalBudgetRepository.save(budget);
            
            log.info("Added expense {} to general budget for user {}", amount, userId);
        } catch (NotFoundException e) {
            log.warn("No active general budget found for user {}", userId);
        }
    }
}
