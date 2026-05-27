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
