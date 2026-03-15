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
	Type                string     `json:"type"`
	CategoryID          *uuid.UUID `json:"category_id,omitempty"`
	MLCategoryID        *uuid.UUID `json:"ml_category_id,omitempty"`
	MLConfidence        *float64   `json:"ml_confidence,omitempty"`
	Description         *string    `json:"description,omitempty"`
	OriginalDescription *string    `json:"original_description,omitempty"`
	Date                time.Time  `json:"date"`
	IsVerified          bool       `json:"is_verified"`
	IsRecurring         bool       `json:"is_recurring"`
}

type Category struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
	Name   string    `json:"name"`
	Type   string    `json:"type"`
}

type ProcessResponse struct {
	Transaction *Transaction `json:"transaction"`
	Category    string       `json:"category"`
	Confidence  float64      `json:"confidence"`
}

type BatchProcessRequest struct {
	TransactionIDs []uuid.UUID `json:"transaction_ids"`
	Limit          int         `json:"limit"`
}
