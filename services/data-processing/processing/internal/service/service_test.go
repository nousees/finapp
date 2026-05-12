package service

import (
	"testing"

	"finapp/services/data-processing/processing/internal/model"
)

func strptr(value string) *string {
	return &value
}

func TestCategorizeExpense(t *testing.T) {
	classifier := NewRuleBasedClassifier()
	tx := &model.Transaction{
		Type:        "EXPENSE",
		Description: strptr("Пятерочка продукты"),
	}

	category, confidence, recurring := classifier.Classify(tx)

	if category != "Продукты" {
		t.Fatalf("expected category Продукты, got %s", category)
	}
	if confidence < 0.9 {
		t.Fatalf("expected confidence >= 0.9, got %.2f", confidence)
	}
	if recurring {
		t.Fatalf("expected recurring false")
	}
}

func TestCategorizeRecurringSubscription(t *testing.T) {
	classifier := NewRuleBasedClassifier()
	tx := &model.Transaction{
		Type:        "EXPENSE",
		Description: strptr("Spotify premium"),
	}

	category, _, recurring := classifier.Classify(tx)

	if category != "Подписки" {
		t.Fatalf("expected category Подписки, got %s", category)
	}
	if !recurring {
		t.Fatalf("expected recurring true")
	}
}
