package model

import (
	"time"

	"github.com/google/uuid"
)

type TransactionType string

const (
	TypeIncome   TransactionType = "INCOME"
	TypeExpense  TransactionType = "EXPENSE"
	TypeTransfer TransactionType = "TRANSFER"
)

type Transaction struct {
	ID                  uuid.UUID       `json:"id"`
	UserID              uuid.UUID       `json:"user_id"`
	Amount              float64         `json:"amount"`
	Currency            string          `json:"currency"`
	Type                TransactionType `json:"type"`
	CategoryID          *uuid.UUID      `json:"category_id,omitempty"`
	MLCategoryID        *uuid.UUID      `json:"ml_category_id,omitempty"`
	MLConfidence        *float64        `json:"ml_confidence,omitempty"`
	Description         *string         `json:"description,omitempty"`
	OriginalDescription *string         `json:"original_description,omitempty"`
	Date                time.Time       `json:"date"`
	PaymentMethod       *string         `json:"payment_method,omitempty"`
	BankAccountID       *uuid.UUID      `json:"bank_account_id,omitempty"`
	IsVerified          bool            `json:"is_verified"`
	IsRecurring         bool            `json:"is_recurring"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type CreateTransactionInput struct {
	Amount        float64         `json:"amount" binding:"required"`
	Currency      string          `json:"currency"`
	Type          TransactionType `json:"type" binding:"required,oneof=INCOME EXPENSE TRANSFER"`
	CategoryID    *uuid.UUID      `json:"category_id"`
	Description   *string         `json:"description"`
	Date         *string         `json:"date"` // ISO8601 или DD.MM.YYYY
	PaymentMethod *string         `json:"payment_method"`
	BankAccountID *uuid.UUID      `json:"bank_account_id"`
}

type CreateTransactionBatchInput struct {
	Transactions []CreateTransactionInput `json:"transactions" binding:"required,dive"`
}

type UpdateTransactionInput struct {
	Amount        *float64         `json:"amount,omitempty"`
	Currency      *string          `json:"currency,omitempty"`
	Type          *TransactionType `json:"type,omitempty" binding:"omitempty,oneof=INCOME EXPENSE TRANSFER"`
	CategoryID    *uuid.UUID       `json:"category_id,omitempty"`
	Description   *string          `json:"description,omitempty"`
	Date          *string          `json:"date,omitempty"`
	PaymentMethod *string          `json:"payment_method,omitempty"`
	BankAccountID *uuid.UUID       `json:"bank_account_id,omitempty"`
	IsVerified    *bool            `json:"is_verified,omitempty"`
}

type ListTransactionsFilter struct {
	Query      string
	Type       TransactionType
	CategoryID *uuid.UUID
	Limit      int
	Offset     int
}
