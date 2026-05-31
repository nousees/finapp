package com.finapp.services.budget;

import com.finapp.models.budget.Budget;
import com.finapp.repositories.budget.BudgetRepository;
import com.finapp.services.dtos.BudgetDTO;
import com.finapp.services.dtos.BudgetViewDTO;
import com.finapp.services.exceptions.ValidationException;
import com.finapp.services.exceptions.NotFoundException;
import com.finapp.services.shared.NotificationService;
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
    private final NotificationService notificationService;

    public List<Budget> getUserBudgets(UUID userId) {
        log.info("Getting budgets for user: {}", userId);
        return budgetRepository.findByUserId(userId);
    }

    public List<Budget> getActiveBudgets(UUID userId) {
        log.info("Getting active budgets for user: {}", userId);
        return budgetRepository.findByUserIdAndIsActiveTrue(userId);
    }

    public List<BudgetViewDTO> getCurrentBudgetViews(UUID userId) {
        log.info("Getting current budget views for user: {}", userId);
        return budgetRepository.findByUserIdAndIsActiveTrue(userId).stream()
            .filter(budget -> !budget.getPeriodStart().isAfter(java.time.LocalDate.now())
                && !budget.getPeriodEnd().isBefore(java.time.LocalDate.now()))
            .map(this::toView)
            .toList();
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
        BigDecimal previousProgress = calculateProgressPercent(budget.getSpentAmount(), budget.getAmountLimit());
        BigDecimal newSpentAmount = nullToZero(budget.getSpentAmount()).add(nullToZero(amount));

        if (newSpentAmount.compareTo(budget.getAmountLimit()) > 0) {
            log.warn("Budget {} exceeded! Limit: {}, Spent: {}",
                     budgetId, budget.getAmountLimit(), newSpentAmount);
        }

        budget.setSpentAmount(newSpentAmount);
        Budget saved = budgetRepository.save(budget);

        checkBudgetThresholds(saved, previousProgress);
    }

    public BigDecimal getBudgetProgress(UUID userId, UUID budgetId) {
        Budget budget = getBudget(userId, budgetId);

        if (budget.getAmountLimit().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return calculateSpentAmount(budget)
            .divide(budget.getAmountLimit(), 2, java.math.RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));
    }

    private BudgetViewDTO toView(Budget budget) {
        BigDecimal limit = nullToZero(budget.getAmountLimit());
        BigDecimal spent = calculateSpentAmount(budget);
        BigDecimal remaining = limit.subtract(spent).max(BigDecimal.ZERO);
        BigDecimal progress = limit.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.ZERO
            : spent.multiply(BigDecimal.valueOf(100)).divide(limit, 2, java.math.RoundingMode.HALF_UP);

        return new BudgetViewDTO(
            budget.getId(),
            budget.getUserId(),
            budget.getCategoryId(),
            resolveCategoryName(budget.getCategoryId()),
            limit,
            spent,
            remaining,
            progress,
            budget.getPeriod(),
            budget.getPeriodStart(),
            budget.getPeriodEnd(),
            budget.getCurrency(),
            budget.getAlertThresholds(),
            budget.getIsActive(),
            budget.getCreatedAt(),
            budget.getUpdatedAt()
        );
    }

    private BigDecimal calculateSpentAmount(Budget budget) {
        BigDecimal value;
        if (budget.getCategoryId() == null) {
            value = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ?
                  AND UPPER(type) = 'EXPENSE'
                  AND date >= ?
                  AND date < ?
                """,
                BigDecimal.class,
                budget.getUserId(),
                budget.getPeriodStart().atStartOfDay(),
                budget.getPeriodEnd().plusDays(1).atStartOfDay()
            );
        } else {
            value = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ?
                  AND UPPER(type) = 'EXPENSE'
                  AND COALESCE(category_id, ml_category_id) = ?
                  AND date >= ?
                  AND date < ?
                """,
                BigDecimal.class,
                budget.getUserId(),
                budget.getCategoryId(),
                budget.getPeriodStart().atStartOfDay(),
                budget.getPeriodEnd().plusDays(1).atStartOfDay()
            );
        }
        return nullToZero(value);
    }

    private String resolveCategoryName(UUID categoryId) {
        if (categoryId == null) {
            return "Общий бюджет";
        }
        List<String> names = jdbcTemplate.queryForList(
            "SELECT name FROM categories WHERE id = ? LIMIT 1",
            String.class,
            categoryId
        );
        return names.isEmpty() ? "Категория" : names.get(0);
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private void checkBudgetThresholds(Budget budget, BigDecimal previousProgress) {
        try {
            List<Integer> thresholds = budget.getAlertThresholds();
            if (thresholds != null && !thresholds.isEmpty()) {
                BigDecimal progress = getBudgetProgress(budget.getUserId(), budget.getId());

                for (Integer threshold : thresholds) {
                    BigDecimal thresholdValue = BigDecimal.valueOf(threshold);
                    if (previousProgress.compareTo(thresholdValue) < 0 && progress.compareTo(thresholdValue) >= 0) {
                        log.info("Budget {} reached threshold {}%", budget.getId(), threshold);
                        notificationService.createBudgetAlert(
                            budget.getUserId(),
                            budget.getId(),
                            resolveCategoryName(budget.getCategoryId()),
                            nullToZero(budget.getSpentAmount()).doubleValue(),
                            nullToZero(budget.getAmountLimit()).doubleValue(),
                            threshold
                        );
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

    private BigDecimal calculateProgressPercent(BigDecimal spentAmount, BigDecimal amountLimit) {
        BigDecimal limit = nullToZero(amountLimit);
        if (limit.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return nullToZero(spentAmount)
            .multiply(BigDecimal.valueOf(100))
            .divide(limit, 2, java.math.RoundingMode.HALF_UP);
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
