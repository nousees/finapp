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

	if category != "Питание" {
		t.Fatalf("expected category Питание, got %s", category)
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

	if category != "Развлечения" {
		t.Fatalf("expected category Развлечения, got %s", category)
	}
	if !recurring {
		t.Fatalf("expected recurring true")
	}
}
