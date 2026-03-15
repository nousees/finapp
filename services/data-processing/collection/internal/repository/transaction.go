package repository

import (
	"context"
	"fmt"
	"strings"
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
	isVerified := in.CategoryID != nil

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
			date, payment_method, bank_account_id, is_verified, is_recurring
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false)
		RETURNING id, user_id, amount, currency, type, category_id, ml_category_id, ml_confidence,
			description, original_description, date, payment_method, bank_account_id, is_verified,
			is_recurring, created_at, updated_at
	`, id, userID, in.Amount, currency, in.Type, catID, desc, desc, txDate, pm, bankID, isVerified).Scan(
		&t.ID, &t.UserID, &t.Amount, &t.Currency, &t.Type, &t.CategoryID, &t.MLCategoryID, &t.MLConfidence,
		&t.Description, &t.OriginalDescription, &t.Date, &t.PaymentMethod, &t.BankAccountID, &t.IsVerified,
		&t.IsRecurring, &t.CreatedAt, &t.UpdatedAt,
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

func (r *TransactionRepo) List(ctx context.Context, userID uuid.UUID, filter model.ListTransactionsFilter) ([]*model.Transaction, error) {
	args := []interface{}{userID}
	conditions := []string{"user_id = $1"}

	if filter.Query != "" {
		args = append(args, "%"+strings.ToLower(strings.TrimSpace(filter.Query))+"%")
		conditions = append(conditions, fmt.Sprintf("(LOWER(COALESCE(description, '')) LIKE $%d OR LOWER(COALESCE(original_description, '')) LIKE $%d)", len(args), len(args)))
	}
	if filter.Type != "" {
		args = append(args, filter.Type)
		conditions = append(conditions, fmt.Sprintf("type = $%d", len(args)))
	}
	if filter.CategoryID != nil {
		args = append(args, *filter.CategoryID)
		conditions = append(conditions, fmt.Sprintf("category_id = $%d", len(args)))
	}

	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	args = append(args, limit)
	limitPos := len(args)
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	args = append(args, offset)
	offsetPos := len(args)

	query := fmt.Sprintf(`
		SELECT id, user_id, amount, currency, type, category_id, ml_category_id, ml_confidence,
			description, original_description, date, payment_method, bank_account_id, is_verified,
			is_recurring, created_at, updated_at
		FROM transactions
		WHERE %s
		ORDER BY date DESC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(conditions, " AND "), limitPos, offsetPos)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*model.Transaction
	for rows.Next() {
		var t model.Transaction
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.Amount, &t.Currency, &t.Type, &t.CategoryID, &t.MLCategoryID, &t.MLConfidence,
			&t.Description, &t.OriginalDescription, &t.Date, &t.PaymentMethod, &t.BankAccountID, &t.IsVerified,
			&t.IsRecurring, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, &t)
	}

	return result, rows.Err()
}

func (r *TransactionRepo) Update(ctx context.Context, userID, transactionID uuid.UUID, in model.UpdateTransactionInput, txDate *time.Time) (*model.Transaction, error) {
	query := `
		UPDATE transactions
		SET amount = COALESCE($3, amount),
			currency = COALESCE($4, currency),
			type = COALESCE($5, type),
			category_id = COALESCE($6, category_id),
			description = COALESCE($7, description),
			date = COALESCE($8, date),
			payment_method = COALESCE($9, payment_method),
			bank_account_id = COALESCE($10, bank_account_id),
			is_verified = COALESCE($11, is_verified),
			updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, amount, currency, type, category_id, ml_category_id, ml_confidence,
			description, original_description, date, payment_method, bank_account_id, is_verified,
			is_recurring, created_at, updated_at
	`

	var (
		amount        interface{}
		currency      interface{}
		txType        interface{}
		categoryID    interface{}
		description   interface{}
		dateValue     interface{}
		paymentMethod interface{}
		bankAccountID interface{}
		isVerified    interface{}
	)

	if in.Amount != nil {
		amount = *in.Amount
	}
	if in.Currency != nil {
		currency = *in.Currency
	}
	if in.Type != nil {
		txType = *in.Type
	}
	if in.CategoryID != nil {
		categoryID = *in.CategoryID
	}
	if in.Description != nil {
		description = *in.Description
	}
	if txDate != nil {
		dateValue = *txDate
	}
	if in.PaymentMethod != nil {
		paymentMethod = *in.PaymentMethod
	}
	if in.BankAccountID != nil {
		bankAccountID = *in.BankAccountID
	}
	if in.IsVerified != nil {
		isVerified = *in.IsVerified
	}

	var t model.Transaction
	err := r.pool.QueryRow(
		ctx,
		query,
		transactionID, userID, amount, currency, txType, categoryID, description, dateValue, paymentMethod, bankAccountID, isVerified,
	).Scan(
		&t.ID, &t.UserID, &t.Amount, &t.Currency, &t.Type, &t.CategoryID, &t.MLCategoryID, &t.MLConfidence,
		&t.Description, &t.OriginalDescription, &t.Date, &t.PaymentMethod, &t.BankAccountID, &t.IsVerified,
		&t.IsRecurring, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
