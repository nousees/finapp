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
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	Name           string     `json:"name"`
	Amount         float64    `json:"amount"`
	Currency       string     `json:"currency"`
	CategoryID     *uuid.UUID `json:"category_id,omitempty"`
	Recurrence     string     `json:"recurrence"`
	UsageIndex     float64    `json:"usage_index"`
	IsActive       bool       `json:"is_active"`
	Recommendation *string    `json:"recommendation,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
