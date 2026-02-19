package repository

import (
	"context"
	"time"

	"finapp/services/data-processing/collection/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionRepo struct {
	pool *pgxpool.Pool
}

func NewTransactionRepo(pool *pgxpool.Pool) *TransactionRepo {
	return &TransactionRepo{pool: pool}
}

func (r *TransactionRepo) Create(ctx context.Context, userID uuid.UUID, in model.CreateTransactionInput, txDate time.Time) (*model.Transaction, error) {
	id := uuid.New()
	currency := "RUB"
	if in.Currency != "" {
		currency = in.Currency
	}

	var catID, bankID *uuid.UUID
	var desc, pm *string
	catID = in.CategoryID
	bankID = in.BankAccountID
	desc = in.Description
	pm = in.PaymentMethod

	var t model.Transaction
	err := r.pool.QueryRow(ctx, `
		INSERT INTO transactions (
			id, user_id, amount, currency, type, category_id, description, original_description,
			date, payment_method, bank_account_id, is_verified
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
		RETURNING id, user_id, amount, currency, type, category_id, description, original_description,
			date, payment_method, bank_account_id, is_verified, created_at, updated_at
	`, id, userID, in.Amount, currency, in.Type, catID, desc, desc, txDate, pm, bankID).Scan(
		&t.ID, &t.UserID, &t.Amount, &t.Currency, &t.Type, &t.CategoryID, &t.Description, &t.OriginalDescription,
		&t.Date, &t.PaymentMethod, &t.BankAccountID, &t.IsVerified, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TransactionRepo) CreateBatch(ctx context.Context, userID uuid.UUID, inputs []model.CreateTransactionInput, parseDate func(string) (time.Time, error)) ([]*model.Transaction, error) {
	result := make([]*model.Transaction, 0, len(inputs))
	for i := range inputs {
		txDate := time.Now().UTC()
		if inputs[i].Date != nil && *inputs[i].Date != "" {
			parsed, err := parseDate(*inputs[i].Date)
			if err != nil {
				return result, err
			}
			txDate = parsed
		}
		t, err := r.Create(ctx, userID, inputs[i], txDate)
		if err != nil {
			return result, err
		}
		result = append(result, t)
	}
	return result, nil
}
