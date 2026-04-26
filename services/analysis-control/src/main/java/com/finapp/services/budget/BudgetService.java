package com.finapp.services.budget;

import com.finapp.models.budget.Budget;
import com.finapp.repositories.budget.BudgetRepository;
import com.finapp.services.dtos.BudgetDTO;
import com.finapp.services.exceptions.ValidationException;
import com.finapp.services.exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final JdbcTemplate jdbcTemplate;

    public List<Budget> getUserBudgets(UUID userId) {
        log.info("Getting budgets for user: {}", userId);
        return budgetRepository.findByUserId(userId);
    }

    public List<Budget> getActiveBudgets(UUID userId) {
        log.info("Getting active budgets for user: {}", userId);
        return budgetRepository.findByUserIdAndIsActiveTrue(userId);
    }

    public Budget getBudget(UUID userId, UUID budgetId) {
        log.info("Getting budget {} for user: {}", budgetId, userId);
        return budgetRepository.findByIdAndUserId(budgetId, userId)
            .orElseThrow(() -> new NotFoundException("Budget", budgetId));
    }

    @Transactional
    public Budget createBudget(UUID userId, BudgetDTO budgetDTO) {
        log.info("Creating budget for user: {}", userId);

        UUID categoryId = parseAndValidateCategoryId(userId, budgetDTO.getCategoryId());
        validateBudgetOverlap(userId, budgetDTO, categoryId);

        Budget budget = new Budget();
        budget.setUserId(userId);
        budget.setCategoryId(categoryId);
        budget.setAmountLimit(budgetDTO.getAmountLimit());
        budget.setPeriod(budgetDTO.getPeriod());
        budget.setPeriodStart(budgetDTO.getPeriodStart());
        budget.setPeriodEnd(budgetDTO.getPeriodEnd());
        budget.setCurrency(budgetDTO.getCurrency());
        budget.setIsActive(budgetDTO.getIsActive());
        budget.setAlertThresholds(budgetDTO.getAlertThresholds());

        return budgetRepository.save(budget);
    }

    @Transactional
    public Budget updateBudget(UUID userId, UUID budgetId, BudgetDTO budgetDTO) {
        log.info("Updating budget {} for user: {}", budgetId, userId);

        Budget budget = getBudget(userId, budgetId);

        UUID categoryId = parseAndValidateCategoryId(userId, budgetDTO.getCategoryId());
        validateBudgetOverlap(userId, budgetDTO, categoryId, budgetId);

        budget.setCategoryId(categoryId);
        budget.setAmountLimit(budgetDTO.getAmountLimit());
        budget.setPeriod(budgetDTO.getPeriod());
        budget.setPeriodStart(budgetDTO.getPeriodStart());
        budget.setPeriodEnd(budgetDTO.getPeriodEnd());
        budget.setCurrency(budgetDTO.getCurrency());
        budget.setIsActive(budgetDTO.getIsActive());
        budget.setAlertThresholds(budgetDTO.getAlertThresholds());

        return budgetRepository.save(budget);
    }

    @Transactional
    public void deleteBudget(UUID userId, UUID budgetId) {
        log.info("Deleting budget {} for user: {}", budgetId, userId);

        Budget budget = getBudget(userId, budgetId);
        budgetRepository.delete(budget);
    }

    @Transactional
    public void addExpenseToBudget(UUID userId, UUID budgetId, BigDecimal amount) {
        log.info("Adding expense {} to budget {} for user: {}", amount, budgetId, userId);

        Budget budget = getBudget(userId, budgetId);
        BigDecimal newSpentAmount = budget.getSpentAmount().add(amount);

        if (newSpentAmount.compareTo(budget.getAmountLimit()) > 0) {
            log.warn("Budget {} exceeded! Limit: {}, Spent: {}",
                     budgetId, budget.getAmountLimit(), newSpentAmount);
        }

        budget.setSpentAmount(newSpentAmount);
        budgetRepository.save(budget);

        checkBudgetThresholds(budget);
    }

    public BigDecimal getBudgetProgress(UUID userId, UUID budgetId) {
        Budget budget = getBudget(userId, budgetId);

        if (budget.getAmountLimit().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return budget.getSpentAmount()
            .divide(budget.getAmountLimit(), 2, java.math.RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));
    }

    private void checkBudgetThresholds(Budget budget) {
        try {
            List<Integer> thresholds = budget.getAlertThresholds();
            if (thresholds != null && !thresholds.isEmpty()) {
                BigDecimal progress = getBudgetProgress(budget.getUserId(), budget.getId());

                for (Integer threshold : thresholds) {
                    if (progress.compareTo(BigDecimal.valueOf(threshold)) >= 0) {
                        log.info("Budget {} reached threshold {}%", budget.getId(), threshold);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error checking budget thresholds: {}", e.getMessage());
        }
    }

    private void validateBudgetOverlap(UUID userId, BudgetDTO budgetDTO, UUID categoryId) {
        validateBudgetOverlap(userId, budgetDTO, categoryId, null);
    }

    private void validateBudgetOverlap(UUID userId, BudgetDTO budgetDTO, UUID categoryId, UUID excludeBudgetId) {
        List<Budget> existingBudgets = budgetRepository.findByUserIdAndIsActiveTrue(userId);

        for (Budget existing : existingBudgets) {
            if (excludeBudgetId != null && existing.getId().equals(excludeBudgetId)) {
                continue;
            }

            if ((existing.getCategoryId() == null && categoryId == null) ||
                (existing.getCategoryId() != null && existing.getCategoryId().equals(categoryId))) {

                boolean periodsOverlap = budgetDTO.getPeriodStart().isBefore(existing.getPeriodEnd()) &&
                                       budgetDTO.getPeriodEnd().isAfter(existing.getPeriodStart());

                if (periodsOverlap) {
                    throw new ValidationException(
                        "Budget overlaps with existing budget",
                        Map.of("period", "Budget period overlaps with an existing active budget for this category")
                    );
                }
            }
        }
    }

    private UUID parseAndValidateCategoryId(UUID userId, String rawCategoryId) {
        if (rawCategoryId == null || rawCategoryId.isBlank()) {
            Map<String, String> errors = new HashMap<>();
            errors.put("categoryId", "Category ID is required");
            throw new ValidationException("Invalid category id", errors);
        }

        try {
            UUID categoryId = UUID.fromString(rawCategoryId);
            validateCategoryBelongsToUserOrSystem(userId, categoryId);
            return categoryId;
        } catch (IllegalArgumentException ex) {
            Map<String, String> errors = new HashMap<>();
            errors.put("categoryId", "Category ID must be a valid UUID");
            throw new ValidationException("Invalid category id format", errors);
        }
    }

    private void validateCategoryBelongsToUserOrSystem(UUID userId, UUID categoryId) {
        Boolean exists = jdbcTemplate.queryForObject(
            """
            SELECT EXISTS (
                SELECT 1
                FROM categories
                WHERE id = ?
                  AND (user_id = ? OR user_id IS NULL)
            )
            """,
            Boolean.class,
            categoryId,
            userId
        );

        if (!Boolean.TRUE.equals(exists)) {
            Map<String, String> errors = new HashMap<>();
            errors.put("categoryId", "Category not found for current user");
            throw new ValidationException("Invalid category id", errors);
        }
    }
}
