package service

import (
	"strings"

	"finapp/services/data-processing/processing/internal/model"
)

type Classifier interface {
	Classify(tx *model.Transaction) (category string, confidence float64, recurring bool)
}

type RuleBasedClassifier struct{}

type categoryRule struct {
	Category   string
	Confidence float64
	Keywords   []string
}

var expenseRules = []categoryRule{
	{Category: "Питание", Confidence: 0.92, Keywords: []string{"кофе", "cafe", "кафе", "restaurant", "еда", "food", "delivery", "пятерочка", "магнит"}},
	{Category: "Транспорт", Confidence: 0.90, Keywords: []string{"taxi", "такси", "metro", "метро", "bus", "автобус", "транспорт", "fuel", "бензин"}},
	{Category: "Жилье", Confidence: 0.88, Keywords: []string{"rent", "аренда", "квартира", "жкх", "electricity", "internet", "коммун"}},
	{Category: "Развлечения", Confidence: 0.84, Keywords: []string{"cinema", "кино", "spotify", "netflix", "подписк", "yandex plus", "игры"}},
	{Category: "Здоровье", Confidence: 0.83, Keywords: []string{"pharmacy", "аптека", "doctor", "clinic", "мед"}},
}

var incomeRules = []categoryRule{
	{Category: "Доход", Confidence: 0.96, Keywords: []string{"salary", "зарплата", "income", "bonus", "премия", "freelance"}},
}

func NewRuleBasedClassifier() *RuleBasedClassifier {
	return &RuleBasedClassifier{}
}

func (RuleBasedClassifier) Classify(tx *model.Transaction) (string, float64, bool) {
	text := strings.ToLower(strings.TrimSpace(joinText(tx.Description, tx.OriginalDescription)))
	rules := expenseRules
	defaultCategory := "Прочее"
	defaultConfidence := 0.55
	if tx.Type == "INCOME" {
		rules = incomeRules
		defaultCategory = "Доход"
		defaultConfidence = 0.72
	}

	for _, rule := range rules {
		for _, keyword := range rule.Keywords {
			if strings.Contains(text, keyword) {
				return rule.Category, rule.Confidence, isRecurring(text)
			}
		}
	}

	return defaultCategory, defaultConfidence, isRecurring(text)
}

func joinText(values ...*string) string {
	parts := make([]string, 0, len(values))
	for _, value := range values {
		if value != nil && strings.TrimSpace(*value) != "" {
			parts = append(parts, strings.TrimSpace(*value))
		}
	}
	return strings.Join(parts, " ")
}

func isRecurring(text string) bool {
	recurringKeywords := []string{"netflix", "spotify", "subscription", "подписк", "yandex plus", "icloud", "google one"}
	for _, keyword := range recurringKeywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return false
}
