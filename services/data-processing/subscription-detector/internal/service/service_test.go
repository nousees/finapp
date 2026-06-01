package service

import (
	"testing"
	"time"

	"finapp/services/data-processing/subscription-detector/internal/model"

	"github.com/google/uuid"
)

func stringPtr(value string) *string {
	return &value
}

func TestGroupTransactionsAllowsSmallAmountChanges(t *testing.T) {
	description := stringPtr("Yandex Plus subscription")
	items := []*model.Transaction{
		{ID: uuid.New(), Amount: 299, Currency: "RUB", Description: description, Date: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)},
		{ID: uuid.New(), Amount: 399, Currency: "RUB", Description: description, Date: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)},
	}

	groups := groupTransactions(items)
	if len(groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(groups))
	}
	if groups[0].amount != 349 {
		t.Fatalf("expected average amount 349, got %.2f", groups[0].amount)
	}
}

func TestDetectRecurrenceMonthly(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	items := []*model.Transaction{
		{ID: uuid.New(), Amount: 299, Date: base},
		{ID: uuid.New(), Amount: 299, Date: base.AddDate(0, 1, 0)},
		{ID: uuid.New(), Amount: 299, Date: base.AddDate(0, 2, 0)},
	}

	recurrence, ok := detectRecurrence(items)
	if !ok {
		t.Fatalf("expected recurrence to be detected")
	}
	if recurrence != "MONTHLY" {
		t.Fatalf("expected MONTHLY, got %s", recurrence)
	}
}

func TestNormalizeName(t *testing.T) {
	value := normalizeName(stringPtr("Spotify Premium подписка"))
	if value != "spotify" {
		t.Fatalf("expected spotify, got %s", value)
	}
}

func TestNormalizeNameStripsNoise(t *testing.T) {
	value := normalizeName(stringPtr("VISA 1234 Оплата Yandex Plus 299.00 RUR"))
	if value != "yandex plus" {
		t.Fatalf("expected yandex plus, got %s", value)
	}
}

func TestDetectRecurrenceRejectsUnstableAmount(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	items := []*model.Transaction{
		{ID: uuid.New(), Amount: 300, Date: base},
		{ID: uuid.New(), Amount: 980, Date: base.AddDate(0, 1, 0)},
		{ID: uuid.New(), Amount: 310, Date: base.AddDate(0, 2, 0)},
	}

	_, ok := detectRecurrence(items)
	if ok {
		t.Fatalf("expected recurrence false for unstable amount series")
	}
}

func uuidPtr(value string) *uuid.UUID {
	parsed := uuid.MustParse(value)
	return &parsed
}

func TestRelatedActivityRaisesStreamingUsage(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	subscriptionDescription := stringPtr("Кинопоиск подписка")
	popcornDescription := stringPtr("Попкорн кинотеатр")
	movieDescription := stringPtr("Cinema tickets")
	group := groupedTransactions{
		name:     "кинопоиск",
		amount:   399,
		currency: "RUB",
		transactions: []*model.Transaction{
			{ID: uuid.New(), Amount: 399, Currency: "RUB", Description: subscriptionDescription, Date: base},
			{ID: uuid.New(), Amount: 399, Currency: "RUB", Description: subscriptionDescription, Date: base.AddDate(0, 1, 0)},
		},
	}
	all := append([]*model.Transaction{}, group.transactions...)
	all = append(all,
		&model.Transaction{ID: uuid.New(), Amount: 250, Currency: "RUB", CategoryID: uuidPtr(entertainmentCategoryID), Description: popcornDescription, Date: base.AddDate(0, 1, 3)},
		&model.Transaction{ID: uuid.New(), Amount: 700, Currency: "RUB", Description: movieDescription, Date: base.AddDate(0, 1, 4)},
	)

	profile := buildSubscriptionProfile(group, "MONTHLY", 0.92, all, nil)
	if profile.relatedActivityIndex <= 0 {
		t.Fatalf("expected related activity to be detected")
	}
	if profile.usageIndex <= 0.35 {
		t.Fatalf("expected related activity to raise usage index, got %.4f", profile.usageIndex)
	}
}

func TestFeedbackCanConfirmUsefulSubscription(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	description := stringPtr("Кинопоиск подписка")
	group := groupedTransactions{
		name:     "кинопоиск",
		amount:   399,
		currency: "RUB",
		transactions: []*model.Transaction{
			{ID: uuid.New(), Amount: 399, Currency: "RUB", Description: description, Date: base},
			{ID: uuid.New(), Amount: 399, Currency: "RUB", Description: description, Date: base.AddDate(0, 1, 0)},
		},
	}
	feedback := &model.SubscriptionFeedback{UsageFrequency: "often", Importance: "high", Decision: "keep", FeedbackScore: 1}

	all := append([]*model.Transaction{}, group.transactions...)
	all = append(all, &model.Transaction{ID: uuid.New(), Amount: 5000, Currency: "RUB", Description: stringPtr("Продукты"), Date: base.AddDate(0, 1, 2)})

	profile := buildSubscriptionProfile(group, "MONTHLY", 0.92, all, feedback)
	if profile.status != "confirmed_useful" {
		t.Fatalf("expected confirmed_useful status, got %s", profile.status)
	}
	if profile.recommendation != nil {
		t.Fatalf("expected no cancellation recommendation for confirmed useful subscription")
	}
	if profile.userFeedbackScore == nil || *profile.userFeedbackScore != 1 {
		t.Fatalf("expected user feedback score to be propagated")
	}
}

func TestFeedbackValidationAndScoring(t *testing.T) {
	feedback, err := newFeedback(uuid.New(), "kinopoisk", model.FeedbackRequest{
		UsageFrequency: "rarely",
		Importance:     "low",
		Decision:       "consider_cancel",
	})
	if err != nil {
		t.Fatalf("expected valid feedback, got %v", err)
	}
	if feedback.FeedbackScore >= 0.25 {
		t.Fatalf("expected low feedback score, got %.4f", feedback.FeedbackScore)
	}

	_, err = newFeedback(uuid.New(), "kinopoisk", model.FeedbackRequest{UsageFrequency: "weekly"})
	if err == nil {
		t.Fatalf("expected validation error for unsupported usage frequency")
	}
}
