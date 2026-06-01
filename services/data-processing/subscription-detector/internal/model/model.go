package model

import (
	"time"

	"github.com/google/uuid"
)

type Transaction struct {
	ID                  uuid.UUID  `json:"id"`
	UserID              uuid.UUID  `json:"user_id"`
	Amount              float64    `json:"amount"`
	Currency            string     `json:"currency"`
	CategoryID          *uuid.UUID `json:"category_id,omitempty"`
	Description         *string    `json:"description,omitempty"`
	OriginalDescription *string    `json:"original_description,omitempty"`
	Date                time.Time  `json:"date"`
}

type Subscription struct {
	ID                       uuid.UUID  `json:"id"`
	UserID                   uuid.UUID  `json:"user_id"`
	Name                     string     `json:"name"`
	Amount                   float64    `json:"amount"`
	Currency                 string     `json:"currency"`
	CategoryID               *uuid.UUID `json:"category_id,omitempty"`
	Recurrence               string     `json:"recurrence"`
	UsageIndex               float64    `json:"usage_index"`
	SubscriptionConfidence   float64    `json:"subscription_confidence"`
	RecommendationConfidence float64    `json:"recommendation_confidence"`
	BudgetImpact             float64    `json:"budget_impact"`
	RelatedActivityIndex     float64    `json:"related_activity_index"`
	UserFeedbackScore        *float64   `json:"user_feedback_score,omitempty"`
	Status                   string     `json:"status"`
	RecommendationType       *string    `json:"recommendation_type,omitempty"`
	EvidenceSummary          string     `json:"evidence_summary"`
	NextAction               string     `json:"next_action"`
	IsActive                 bool       `json:"is_active"`
	Recommendation           *string    `json:"recommendation,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}

type SubscriptionFeedback struct {
	UserID           uuid.UUID `json:"user_id"`
	SubscriptionID   uuid.UUID `json:"subscription_id,omitempty"`
	SubscriptionName string    `json:"subscription_name"`
	UsageFrequency   string    `json:"usage_frequency"`
	Importance       string    `json:"importance"`
	Decision         string    `json:"decision"`
	FeedbackScore    float64   `json:"feedback_score"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type FeedbackRequest struct {
	UsageFrequency string `json:"usage_frequency" binding:"required"`
	Importance     string `json:"importance"`
	Decision       string `json:"decision"`
}
