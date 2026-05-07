package repository

import (
	"context"
	"errors"

	"finapp/services/data-processing/processing/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) GetTransactionByID(ctx context.Context, userID, transactionID uuid.UUID) (*model.Transaction, error) {
	var t model.Transaction
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, amount, currency, type, category_id, ml_category_id, ml_confidence,
			description, original_description, date, is_verified, is_recurring
		FROM transactions
		WHERE id = $1 AND user_id = $2
	`, transactionID, userID).Scan(
		&t.ID, &t.UserID, &t.Amount, &t.Currency, &t.Type, &t.CategoryID, &t.MLCategoryID, &t.MLConfidence,
		&t.Description, &t.OriginalDescription, &t.Date, &t.IsVerified, &t.IsRecurring,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) ListUnverified(ctx context.Context, userID uuid.UUID, limit int) ([]*model.Transaction, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, amount, currency, type, category_id, ml_category_id, ml_confidence,
			description, original_description, date, is_verified, is_recurring
		FROM transactions
		WHERE user_id = $1 AND (is_verified = FALSE OR category_id IS NULL)
		ORDER BY date DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*model.Transaction
	for rows.Next() {
		var t model.Transaction
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.Amount, &t.Currency, &t.Type, &t.CategoryID, &t.MLCategoryID, &t.MLConfidence,
			&t.Description, &t.OriginalDescription, &t.Date, &t.IsVerified, &t.IsRecurring,
		); err != nil {
			return nil, err
		}
		result = append(result, &t)
	}
	return result, rows.Err()
}

func (r *Repository) EnsureCategory(ctx context.Context, userID uuid.UUID, name, txType string) (*model.Category, error) {
	var c model.Category
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, name, type
		FROM categories
		WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND type = $3
	`, userID, name, txType).Scan(&c.ID, &c.UserID, &c.Name, &c.Type)
	if err == nil {
		return &c, nil
	}

	id := uuid.New()
	err = r.pool.QueryRow(ctx, `
		INSERT INTO categories (id, user_id, name, type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, name, type
	`, id, userID, name, txType).Scan(&c.ID, &c.UserID, &c.Name, &c.Type)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) MarkCategorized(ctx context.Context, transactionID uuid.UUID, categoryID uuid.UUID, confidence float64, recurring bool) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE transactions
		SET category_id = $2,
			ml_category_id = $2,
			ml_confidence = $3,
			is_verified = TRUE,
			is_recurring = $4,
			updated_at = NOW()
		WHERE id = $1
	`, transactionID, categoryID, confidence, recurring)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return errors.New("transaction not found")
	}
	return nil
}
