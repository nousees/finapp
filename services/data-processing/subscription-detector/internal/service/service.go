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

const (
	subscriptionCategoryID  = "88888888-8888-8888-8888-888888888886"
	entertainmentCategoryID = "66666666-6666-6666-6666-666666666666"
	healthCategoryID        = "77777777-7777-7777-7777-777777777777"
	educationCategoryID     = "88888888-8888-8888-8888-888888888883"
	shoppingCategoryID      = "88888888-8888-8888-8888-888888888884"
)

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

type subscriptionProfile struct {
	usageIndex               float64
	subscriptionConfidence   float64
	recommendationConfidence float64
	budgetImpact             float64
	relatedActivityIndex     float64
	userFeedbackScore        *float64
	status                   string
	recommendationType       *string
	evidenceSummary          string
	nextAction               string
	recommendation           *string
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
	feedbackByName, err := s.repo.ListFeedback(ctx, userID)
	if err != nil {
		return nil, err
	}

	groups := groupTransactions(transactions)
	subscriptions := make([]*model.Subscription, 0)
	recurringIDs := make([]uuid.UUID, 0)

	for _, group := range groups {
		recurrence, ok := detectRecurrence(group.transactions)
		subscriptionConfidence := 0.92
		if !ok && isLikelySubscription(group) && len(group.transactions) == 1 {
			recurrence = "MONTHLY"
			ok = true
			subscriptionConfidence = 0.64
		}
		if !ok && isLikelySubscription(group) {
			if !hasStableAmount(group.transactions) {
				continue
			}
			recurrence = "MONTHLY"
			ok = true
			subscriptionConfidence = 0.78
		}
		if !ok {
			continue
		}
		if isLikelySubscription(group) {
			subscriptionConfidence = maxFloat(subscriptionConfidence, 0.82)
		}

		feedback := feedbackByName[group.name]
		profile := buildSubscriptionProfile(group, recurrence, subscriptionConfidence, transactions, feedback)

		item := &model.Subscription{
			ID:                       uuid.New(),
			UserID:                   userID,
			Name:                     group.name,
			Amount:                   group.amount,
			Currency:                 group.currency,
			CategoryID:               group.categoryID,
			Recurrence:               recurrence,
			UsageIndex:               profile.usageIndex,
			SubscriptionConfidence:   profile.subscriptionConfidence,
			RecommendationConfidence: profile.recommendationConfidence,
			BudgetImpact:             profile.budgetImpact,
			RelatedActivityIndex:     profile.relatedActivityIndex,
			UserFeedbackScore:        profile.userFeedbackScore,
			Status:                   profile.status,
			RecommendationType:       profile.recommendationType,
			EvidenceSummary:          profile.evidenceSummary,
			NextAction:               profile.nextAction,
			IsActive:                 true,
			Recommendation:           profile.recommendation,
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
			recommendationTitle(item),
			*item.Recommendation,
			estimatedMonthlySavings(item),
		); err != nil {
			return nil, err
		}
	}

	return subscriptions, nil
}

func (s *Service) SaveFeedback(ctx context.Context, userID, subscriptionID uuid.UUID, request model.FeedbackRequest) (*model.SubscriptionFeedback, error) {
	subscription, err := s.repo.GetSubscription(ctx, userID, subscriptionID)
	if err != nil {
		return nil, err
	}

	feedback, err := newFeedback(userID, subscription.Name, request)
	if err != nil {
		return nil, err
	}
	feedback.SubscriptionID = subscription.ID

	if err := s.repo.UpsertFeedback(ctx, feedback); err != nil {
		return nil, err
	}
	return feedback, nil
}

func buildSubscriptionProfile(group groupedTransactions, recurrence string, subscriptionConfidence float64, allTransactions []*model.Transaction, feedback *model.SubscriptionFeedback) subscriptionProfile {
	relatedActivityIndex := calculateRelatedActivityIndex(group, allTransactions)
	budgetImpact := calculateBudgetImpact(group, recurrence, allTransactions)
	baseUsage := estimateUsageIndex(group.name) / 100
	usageIndex := clamp01(baseUsage + relatedActivityIndex*0.25)

	var userFeedbackScore *float64
	if feedback != nil {
		userFeedbackScore = &feedback.FeedbackScore
		usageIndex = clamp01(usageIndex*0.55 + feedback.FeedbackScore*0.45)
	}

	evidence := []string{
		fmt.Sprintf("регулярность: %s", recurrence),
		fmt.Sprintf("уверенность в подписке: %.0f%%", subscriptionConfidence*100),
		fmt.Sprintf("оценка использования: %.0f%%", usageIndex*100),
	}
	if relatedActivityIndex > 0 {
		evidence = append(evidence, fmt.Sprintf("смежная активность: %.0f%%", relatedActivityIndex*100))
	}
	if budgetImpact > 0 {
		evidence = append(evidence, fmt.Sprintf("нагрузка на месячные расходы: %.0f%%", budgetImpact*100))
	}
	if feedback != nil {
		evidence = append(evidence, fmt.Sprintf("ответ пользователя: %s", humanFeedback(feedback)))
	}

	status := "healthy"
	nextAction := "Оставить без изменений и продолжить наблюдение."
	recommendationConfidence := 0.35
	var recommendationType *string
	var recommendation *string

	if feedback != nil && feedback.Decision == "already_cancelled" {
		status = "user_cancelled"
		nextAction = "Проверить, прекратились ли следующие списания."
		recommendationConfidence = 0.88
		recommendationType = textPtr("monitor_cancellation")
		recommendation = textPtr(fmt.Sprintf("Вы отметили, что подписка %s уже отменена. Проверьте следующее списание; если оно повторится, стоит обратиться в поддержку сервиса.", group.name))
	} else if feedback != nil && (feedback.Decision == "keep" || feedback.FeedbackScore >= 0.75) {
		status = "confirmed_useful"
		nextAction = "Не предлагать отмену, пока стоимость не начнёт заметно давить на бюджет."
		recommendationConfidence = 0.72
		if budgetImpact >= 0.35 {
			status = "optimize_budget"
			recommendationConfidence = 0.70
			recommendationType = textPtr("optimize_tariff")
			recommendation = textPtr(fmt.Sprintf("Подписка %s используется, но занимает заметную часть месячных расходов. Проверьте семейный доступ, годовой тариф или более дешёвый план.", group.name))
		}
	} else if usageIndex < 0.30 && budgetImpact >= 0.25 {
		status = "consider_cancel"
		nextAction = "Предложить отмену, паузу или напоминание перед следующим списанием."
		recommendationConfidence = 0.90
		recommendationType = textPtr("cancel_or_pause")
		recommendation = textPtr(fmt.Sprintf("Подписка %s выглядит редко используемой и заметно влияет на бюджет. Если она не нужна, отмена сэкономит примерно %.2f %s в месяц.", group.name, monthlyEquivalent(group.amount, recurrence), group.currency))
	} else if usageIndex < 0.42 && budgetImpact >= 0.15 {
		status = "needs_feedback"
		nextAction = "Задать короткий вопрос: пользуетесь ли вы этой подпиской часто, иногда, редко или не пользуетесь."
		recommendationConfidence = 0.68
		recommendationType = textPtr("ask_feedback")
		recommendation = textPtr(fmt.Sprintf("Мы нашли подписку %s с невысокой оценкой использования. Ответьте на один вопрос о частоте использования, чтобы рекомендация была точнее.", group.name))
	} else if budgetImpact >= 0.35 {
		status = "optimize_budget"
		nextAction = "Предложить проверить тариф, семейный доступ или годовую оплату."
		recommendationConfidence = 0.64
		recommendationType = textPtr("optimize_tariff")
		recommendation = textPtr(fmt.Sprintf("Подписка %s занимает большую долю месячных расходов. Если сервис нужен, проверьте более выгодный тариф вместо полной отмены.", group.name))
	} else if feedback == nil && (subscriptionConfidence < 0.75 || usageIndex < 0.55) {
		status = "needs_feedback"
		nextAction = "Уточнить частоту использования микроопросом в карточке подписки."
		recommendationConfidence = 0.56
		recommendationType = textPtr("ask_feedback")
		recommendation = textPtr(fmt.Sprintf("По подписке %s не хватает данных об использовании. Короткий ответ пользователя поможет не советовать лишнюю отмену.", group.name))
	}

	return subscriptionProfile{
		usageIndex:               roundScore(usageIndex),
		subscriptionConfidence:   roundScore(subscriptionConfidence),
		recommendationConfidence: roundScore(recommendationConfidence),
		budgetImpact:             roundScore(budgetImpact),
		relatedActivityIndex:     roundScore(relatedActivityIndex),
		userFeedbackScore:        userFeedbackScore,
		status:                   status,
		recommendationType:       recommendationType,
		evidenceSummary:          strings.Join(evidence, "; "),
		nextAction:               nextAction,
		recommendation:           recommendation,
	}
}

func groupTransactions(items []*model.Transaction) []groupedTransactions {
	buckets := make(map[string]*groupedTransactions)

	for _, item := range items {
		name := normalizeName(item.Description, item.OriginalDescription)
		if name == "" {
			continue
		}

		key := name + "|" + item.Currency
		group, ok := buckets[key]
		if !ok {
			group = &groupedTransactions{
				name:       name,
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
		group.amount = averageAmount(group.transactions)
		result = append(result, *group)
	}

	return result
}

func detectRecurrence(items []*model.Transaction) (string, bool) {
	if len(items) < 2 {
		return "", false
	}
	if !hasStableAmount(items) {
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

func hasStableAmount(items []*model.Transaction) bool {
	if len(items) < 2 {
		return false
	}
	minAmount := items[0].Amount
	maxAmount := items[0].Amount
	total := 0.0
	for _, item := range items {
		if item.Amount < minAmount {
			minAmount = item.Amount
		}
		if item.Amount > maxAmount {
			maxAmount = item.Amount
		}
		total += item.Amount
	}
	avg := total / float64(len(items))
	if avg <= 0 {
		return false
	}
	variance := (maxAmount - minAmount) / avg
	return variance <= 0.25
}

func estimateUsageIndex(name string) float64 {
	text := strings.ToLower(name)
	switch {
	case containsAny(text, "fitness", "gym", "фитнес", "спорт", "зал", "тренировка"):
		return 65
	case containsAny(text, "google one", "icloud", "adobe", "figma", "notion", "chatgpt", "github"):
		return 55
	case containsAny(text, "spotify", "netflix", "youtube", "youtube premium", "яндекс", "яндекс плюс", "кинопоиск", "ivi", "okko", "wink", "start", "premier", "amediateka", "vk music", "boom"):
		return 35
	default:
		return 50
	}
}

func isLikelySubscription(group groupedTransactions) bool {
	if group.categoryID != nil && group.categoryID.String() == subscriptionCategoryID {
		return true
	}
	text := strings.ToLower(group.name)
	if containsAny(text, "подпис", "яндекс", "яндекс плюс", "кинопоиск", "сберпрайм", "сбер prime", "okko", "wink", "start", "premier", "amediateka", "vk music", "boom", "литрес", "mybook") {
		return true
	}
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

func calculateRelatedActivityIndex(group groupedTransactions, allTransactions []*model.Transaction) float64 {
	if len(group.transactions) == 0 {
		return 0
	}
	groupIDs := make(map[uuid.UUID]struct{}, len(group.transactions))
	latest := group.transactions[len(group.transactions)-1].Date
	for _, tx := range group.transactions {
		groupIDs[tx.ID] = struct{}{}
		if tx.Date.After(latest) {
			latest = tx.Date
		}
	}

	matches := 0
	for _, tx := range allTransactions {
		if _, ok := groupIDs[tx.ID]; ok {
			continue
		}
		if tx.Currency != group.currency || tx.Date.Before(latest.AddDate(0, -2, 0)) {
			continue
		}
		if isRelatedActivity(group.name, tx) {
			matches++
		}
	}

	if matches == 0 {
		return 0
	}
	return clamp01(float64(matches) / 4)
}

func calculateBudgetImpact(group groupedTransactions, recurrence string, allTransactions []*model.Transaction) float64 {
	if len(allTransactions) == 0 {
		return 0
	}
	latest := allTransactions[len(allTransactions)-1].Date
	for _, tx := range allTransactions {
		if tx.Date.After(latest) {
			latest = tx.Date
		}
	}

	monthlySpend := 0.0
	for _, tx := range allTransactions {
		if tx.Currency == group.currency && !tx.Date.Before(latest.AddDate(0, -1, 0)) {
			monthlySpend += tx.Amount
		}
	}
	if monthlySpend <= 0 {
		return 0
	}
	return clamp01(monthlyEquivalent(group.amount, recurrence) / monthlySpend)
}

func monthlyEquivalent(amount float64, recurrence string) float64 {
	switch recurrence {
	case "WEEKLY":
		return amount * 4.33
	case "YEARLY":
		return amount / 12
	default:
		return amount
	}
}

func isRelatedActivity(subscriptionName string, tx *model.Transaction) bool {
	text := normalizeName(tx.Description, tx.OriginalDescription)
	if text == "" {
		return false
	}
	category := ""
	if tx.CategoryID != nil {
		category = tx.CategoryID.String()
	}
	sub := strings.ToLower(subscriptionName)

	if containsAny(sub, "кинопоиск", "netflix", "ivi", "okko", "wink", "start", "premier", "amediateka", "youtube") {
		return category == entertainmentCategoryID || containsAny(text, "кино", "cinema", "попкорн", "movie", "театр", "концерт", "развлеч")
	}
	if containsAny(sub, "spotify", "vk music", "boom", "music", "музык") {
		return category == entertainmentCategoryID || containsAny(text, "концерт", "наушник", "музык", "audio", "аудио")
	}
	if containsAny(sub, "fitness", "gym", "фитнес", "спорт", "зал") {
		return category == healthCategoryID || containsAny(text, "спорт", "протеин", "зал", "фитнес", "трениров")
	}
	if containsAny(sub, "литрес", "mybook", "book", "книг") {
		return category == educationCategoryID || containsAny(text, "книг", "book", "литератур", "курс")
	}
	if containsAny(sub, "adobe", "figma", "notion", "chatgpt", "github", "google one", "icloud") {
		return category == shoppingCategoryID || category == educationCategoryID || containsAny(text, "software", "софт", "курс", "обуч", "ноутбук", "storage", "cloud", "облако")
	}
	return false
}

func newFeedback(userID uuid.UUID, subscriptionName string, request model.FeedbackRequest) (*model.SubscriptionFeedback, error) {
	usageFrequency := normalizeChoice(request.UsageFrequency)
	importance := normalizeChoice(request.Importance)
	decision := normalizeChoice(request.Decision)
	if importance == "" {
		importance = "medium"
	}
	if decision == "" {
		decision = "none"
	}
	if !isAllowed(usageFrequency, "often", "sometimes", "rarely", "never") {
		return nil, fmt.Errorf("usage_frequency must be one of: often, sometimes, rarely, never")
	}
	if !isAllowed(importance, "high", "medium", "low") {
		return nil, fmt.Errorf("importance must be one of: high, medium, low")
	}
	if !isAllowed(decision, "none", "keep", "remind", "consider_cancel", "already_cancelled", "dismiss") {
		return nil, fmt.Errorf("decision must be one of: none, keep, remind, consider_cancel, already_cancelled, dismiss")
	}

	return &model.SubscriptionFeedback{
		UserID:           userID,
		SubscriptionName: subscriptionName,
		UsageFrequency:   usageFrequency,
		Importance:       importance,
		Decision:         decision,
		FeedbackScore:    feedbackScore(usageFrequency, importance, decision),
	}, nil
}

func feedbackScore(usageFrequency, importance, decision string) float64 {
	score := map[string]float64{"often": 0.95, "sometimes": 0.65, "rarely": 0.25, "never": 0.05}[usageFrequency]
	switch importance {
	case "high":
		score += 0.10
	case "low":
		score -= 0.10
	}
	switch decision {
	case "keep", "dismiss":
		score += 0.10
	case "consider_cancel":
		score -= 0.15
	case "already_cancelled":
		score = 0
	}
	return roundScore(clamp01(score))
}

func humanFeedback(feedback *model.SubscriptionFeedback) string {
	return fmt.Sprintf("%s / важность %s / решение %s", feedback.UsageFrequency, feedback.Importance, feedback.Decision)
}

func recommendationTitle(item *model.Subscription) string {
	if item.RecommendationType == nil {
		return "Проверить подписку: " + item.Name
	}
	switch *item.RecommendationType {
	case "cancel_or_pause":
		return "Возможная экономия на подписке: " + item.Name
	case "optimize_tariff":
		return "Оптимизировать тариф подписки: " + item.Name
	case "monitor_cancellation":
		return "Проверить отмену подписки: " + item.Name
	default:
		return "Уточнить использование подписки: " + item.Name
	}
}

func estimatedMonthlySavings(item *model.Subscription) float64 {
	if item.RecommendationType != nil && *item.RecommendationType == "cancel_or_pause" {
		return monthlyEquivalent(item.Amount, item.Recurrence)
	}
	return 0
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
		"покупка", "",
		"перевод", "",
		"подписка", "",
		"подписки", "",
		"premium", "",
		"subscription", "",
		"card", "",
		"visa", "",
		"mastercard", "",
		"mir", "",
		"rur", "",
		"rub", "",
		"  ", " ",
	)
	normalized := strings.TrimSpace(replacer.Replace(raw))
	normalized = strings.TrimSpace(stripDigitsAndPunctuation(normalized))
	if normalized == "" {
		return raw
	}
	return normalized
}

func stripDigitsAndPunctuation(value string) string {
	parts := strings.FieldsFunc(value, func(r rune) bool {
		if r >= '0' && r <= '9' {
			return true
		}
		switch r {
		case ',', '.', ';', ':', '#', '/', '\\', '_', '-', '*', '(', ')':
			return true
		default:
			return false
		}
	})
	return strings.Join(parts, " ")
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

func roundScore(value float64) float64 {
	text := fmt.Sprintf("%.4f", value)
	result, err := strconv.ParseFloat(text, 64)
	if err != nil {
		return value
	}
	return result
}

func averageAmount(items []*model.Transaction) float64 {
	if len(items) == 0 {
		return 0
	}
	total := 0.0
	for _, item := range items {
		total += item.Amount
	}
	return roundAmount(total / float64(len(items)))
}

func clamp01(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}

func maxFloat(left, right float64) float64 {
	if left > right {
		return left
	}
	return right
}

func normalizeChoice(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func isAllowed(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}

func textPtr(value string) *string {
	return &value
}
