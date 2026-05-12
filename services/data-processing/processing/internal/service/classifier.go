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
	{Category: "Продукты", Confidence: 0.93, Keywords: []string{"кофе to go", "пятерочка", "пятёрочка", "магнит", "лента", "перекресток", "вкусвилл", "продукты", "супермаркет"}},
	{Category: "Кафе и рестораны", Confidence: 0.9, Keywords: []string{"cafe", "кафе", "restaurant", "ресторан", "еда", "food", "delivery", "доставка еды", "пицца", "бургер", "кофе"}},
	{Category: "Транспорт", Confidence: 0.9, Keywords: []string{"taxi", "такси", "metro", "метро", "bus", "автобус", "транспорт", "fuel", "бензин", "азс", "парковка"}},
	{Category: "Жилье", Confidence: 0.88, Keywords: []string{"rent", "аренда", "ипотека", "квартира", "жилье"}},
	{Category: "Коммунальные услуги", Confidence: 0.88, Keywords: []string{"жкх", "electricity", "internet", "коммун", "вода", "газ", "электричество"}},
	{Category: "Развлечения", Confidence: 0.84, Keywords: []string{"cinema", "кино", "игры", "театр", "концерт"}},
	{Category: "Подписки", Confidence: 0.92, Keywords: []string{"spotify", "netflix", "подписк", "yandex plus", "youtube premium", "google one", "icloud"}},
	{Category: "Здоровье", Confidence: 0.84, Keywords: []string{"pharmacy", "аптека", "doctor", "clinic", "мед", "врач", "лекарств"}},
	{Category: "Образование", Confidence: 0.84, Keywords: []string{"курс", "обучени", "учеб", "school", "университет", "репетитор"}},
	{Category: "Покупки", Confidence: 0.8, Keywords: []string{"wildberries", "ozon", "marketplace", "покупк", "товар"}},
	{Category: "Одежда и обувь", Confidence: 0.85, Keywords: []string{"одежд", "обув", "кроссовк", "куртк", "футболк"}},
	{Category: "Путешествия", Confidence: 0.86, Keywords: []string{"авиабилет", "отель", "поездка", "отпуск", "путешеств"}},
	{Category: "Семья и дети", Confidence: 0.82, Keywords: []string{"ребен", "дети", "садик", "игрушк", "подгузник"}},
	{Category: "Красота и уход", Confidence: 0.82, Keywords: []string{"маникюр", "салон", "косметик", "барбершоп", "уход"}},
	{Category: "Спорт", Confidence: 0.83, Keywords: []string{"фитнес", "зал", "спорт", "тренировк", "бассейн"}},
	{Category: "Питомцы", Confidence: 0.82, Keywords: []string{"зоомагазин", "ветеринар", "корм", "питом", "собак", "кот"}},
	{Category: "Электроника", Confidence: 0.84, Keywords: []string{"смартфон", "ноутбук", "наушник", "техник", "электроник", "dns"}},
	{Category: "Подарки", Confidence: 0.8, Keywords: []string{"подарок", "цветы", "букет", "праздник"}},
	{Category: "Налоги и комиссии", Confidence: 0.85, Keywords: []string{"комисси", "налог", "штраф", "пошлин", "сбор"}},
}

var incomeRules = []categoryRule{
	{Category: "Зарплата", Confidence: 0.96, Keywords: []string{"salary", "зарплата", "income", "аванс", "оклад"}},
	{Category: "Фриланс", Confidence: 0.88, Keywords: []string{"freelance", "фриланс", "заказ", "проект"}},
	{Category: "Бонусы и премии", Confidence: 0.87, Keywords: []string{"bonus", "премия", "бонус"}},
	{Category: "Кэшбэк", Confidence: 0.91, Keywords: []string{"cashback", "кэшбэк"}},
	{Category: "Подарки и переводы", Confidence: 0.8, Keywords: []string{"перевод", "подарили", "подарок от"}},
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
		defaultCategory = "Зарплата"
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
