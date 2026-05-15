package service

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"finapp/services/data-processing/subscription-detector/internal/model"
	"finapp/services/data-processing/subscription-detector/internal/repository"

	"github.com/google/uuid"
)

const subscriptionCategoryID = "88888888-8888-8888-8888-888888888886"

type Service struct {
	repo *repository.Repository
}

type groupedTransactions struct {
	name         string
	amount       float64
	currency     string
	categoryID   *uuid.UUID
	transactions []*model.Transaction
}

func New(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]*model.Subscription, error) {
	return s.repo.ListSubscriptions(ctx, userID)
}

func (s *Service) Analyze(ctx context.Context, userID uuid.UUID) ([]*model.Subscription, error) {
	transactions, err := s.repo.ListExpenseTransactions(ctx, userID, time.Now().UTC().AddDate(0, -6, 0))
	if err != nil {
		return nil, err
	}

	groups := groupTransactions(transactions)
	subscriptions := make([]*model.Subscription, 0)
	recurringIDs := make([]uuid.UUID, 0)

	for _, group := range groups {
		recurrence, ok := detectRecurrence(group.transactions)
		if !ok && isLikelySubscription(group) {
			recurrence = "MONTHLY"
			ok = true
		}
		if !ok {
			continue
		}

		usageIndex := estimateUsageIndex(group.name)
		var recommendation *string
		if usageIndex < 30 {
			text := "Низкий индекс использования. Проверьте, нужна ли эта подписка."
			recommendation = &text
		}

		item := &model.Subscription{
			ID:             uuid.New(),
			UserID:         userID,
			Name:           group.name,
			Amount:         group.amount,
			Currency:       group.currency,
			CategoryID:     group.categoryID,
			Recurrence:     recurrence,
			UsageIndex:     usageIndex,
			IsActive:       true,
			Recommendation: recommendation,
		}
		subscriptions = append(subscriptions, item)

		for _, tx := range group.transactions {
			recurringIDs = append(recurringIDs, tx.ID)
		}
	}

	if err := s.repo.ReplaceSubscriptions(ctx, userID, subscriptions); err != nil {
		return nil, err
	}
	if err := s.repo.MarkRecurring(ctx, recurringIDs); err != nil {
		return nil, err
	}

	for _, item := range subscriptions {
		if item.Recommendation == nil {
			continue
		}
		if err := s.repo.CreateRecommendation(
			ctx,
			userID,
			"Проверить подписку: "+item.Name,
			*item.Recommendation,
			item.Amount,
		); err != nil {
			return nil, err
		}
	}

	return subscriptions, nil
}

func groupTransactions(items []*model.Transaction) []groupedTransactions {
	buckets := make(map[string]*groupedTransactions)

	for _, item := range items {
		name := normalizeName(item.Description, item.OriginalDescription)
		if name == "" {
			continue
		}

		amount := roundAmount(item.Amount)
		key := name + "|" + item.Currency + "|" + strconv.FormatFloat(amount, 'f', 2, 64)
		group, ok := buckets[key]
		if !ok {
			group = &groupedTransactions{
				name:       name,
				amount:     amount,
				currency:   item.Currency,
				categoryID: item.CategoryID,
			}
			buckets[key] = group
		}
		group.transactions = append(group.transactions, item)
	}

	result := make([]groupedTransactions, 0, len(buckets))
	for _, group := range buckets {
		sort.Slice(group.transactions, func(i, j int) bool {
			return group.transactions[i].Date.Before(group.transactions[j].Date)
		})
		result = append(result, *group)
	}

	return result
}

func detectRecurrence(items []*model.Transaction) (string, bool) {
	if len(items) < 2 {
		return "", false
	}

	totalDays := 0.0
	count := 0.0
	for i := 1; i < len(items); i++ {
		totalDays += items[i].Date.Sub(items[i-1].Date).Hours() / 24
		count++
	}
	averageDays := totalDays / count

	switch {
	case averageDays >= 6 && averageDays <= 8:
		return "WEEKLY", true
	case averageDays >= 25 && averageDays <= 35:
		return "MONTHLY", true
	case averageDays >= 330 && averageDays <= 390:
		return "YEARLY", true
	default:
		return "", false
	}
}

func estimateUsageIndex(name string) float64 {
	text := strings.ToLower(name)
	switch {
	case containsAny(text, "spotify", "netflix", "youtube", "youtube premium", "яндекс", "яндекс плюс", "кинопоиск", "ivi", "google one", "icloud"):
		return 20
	case containsAny(text, "fitness", "gym", "фитнес", "спорт", "зал", "тренировка"):
		return 65
	default:
		return 50
	}
}

func isLikelySubscription(group groupedTransactions) bool {
	if group.categoryID != nil && group.categoryID.String() == subscriptionCategoryID {
		return true
	}
	text := strings.ToLower(group.name)
	return containsAny(
		text,
		"подпис",
		"subscription",
		"premium",
		"spotify",
		"netflix",
		"youtube",
		"яндекс",
		"кинопоиск",
		"ivi",
		"google one",
		"icloud",
	)
}

func normalizeName(values ...*string) string {
	var raw string
	for _, value := range values {
		if value != nil && strings.TrimSpace(*value) != "" {
			raw = strings.ToLower(strings.TrimSpace(*value))
			break
		}
	}
	if raw == "" {
		return ""
	}

	replacer := strings.NewReplacer(
		"оплата", "",
		"платеж", "",
		"подписка", "",
		"подписки", "",
		"premium", "",
		"subscription", "",
		"  ", " ",
	)
	normalized := strings.TrimSpace(replacer.Replace(raw))
	if normalized == "" {
		return raw
	}
	return normalized
}

func containsAny(text string, needles ...string) bool {
	for _, needle := range needles {
		if strings.Contains(text, needle) {
			return true
		}
	}
	return false
}

func roundAmount(value float64) float64 {
	text := fmt.Sprintf("%.2f", value)
	result, err := strconv.ParseFloat(text, 64)
	if err != nil {
		return value
	}
	return result
}
