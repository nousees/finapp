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

func TestDetectRecurrenceMonthly(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	items := []*model.Transaction{
		{ID: uuid.New(), Date: base},
		{ID: uuid.New(), Date: base.AddDate(0, 1, 0)},
		{ID: uuid.New(), Date: base.AddDate(0, 2, 0)},
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
