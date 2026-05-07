package repository

import (
	"context"
	"time"

	"finapp/services/data-processing/subscription-detector/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) EnsureCompatibility(ctx context.Context) error {
	if _, err := r.pool.Exec(ctx, `
		ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS recommendation TEXT
	`); err != nil {
		return err
	}
	if _, err := r.pool.Exec(ctx, `
		ALTER TABLE subscriptions ALTER COLUMN next_billing_date DROP NOT NULL
	`); err != nil {
		return err
	}
	return nil
}

func (r *Repository) ListExpenseTransactions(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.Transaction, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, amount, currency, category_id, description, original_description, date
		FROM transactions
		WHERE user_id = $1
			AND type = 'EXPENSE'
			AND date >= $2
		ORDER BY date ASC
	`, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.Transaction, 0)
	for rows.Next() {
		var item model.Transaction
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Amount,
			&item.Currency,
			&item.CategoryID,
			&item.Description,
			&item.OriginalDescription,
			&item.Date,
		); err != nil {
			return nil, err
		}
		result = append(result, &item)
	}

	return result, rows.Err()
}

func (r *Repository) ReplaceSubscriptions(ctx context.Context, userID uuid.UUID, items []*model.Subscription) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM subscriptions WHERE user_id = $1`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM recommendations WHERE user_id = $1 AND type = 'subscription'`, userID); err != nil {
		return err
	}

	for _, item := range items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO subscriptions (
				id, user_id, name, amount, currency, category_id, recurrence, usage_index, is_active, recommendation
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`,
			item.ID, item.UserID, item.Name, item.Amount, item.Currency, item.CategoryID,
			item.Recurrence, item.UsageIndex, item.IsActive, item.Recommendation,
		); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) CreateRecommendation(ctx context.Context, userID uuid.UUID, title, description string, savings float64) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO recommendations (id, user_id, type, title, description, estimated_savings)
		VALUES ($1, $2, 'subscription', $3, $4, $5)
	`, uuid.New(), userID, title, description, savings)
	return err
}

func (r *Repository) MarkRecurring(ctx context.Context, transactionIDs []uuid.UUID) error {
	if len(transactionIDs) == 0 {
		return nil
	}

	_, err := r.pool.Exec(ctx, `
		UPDATE transactions
		SET is_recurring = TRUE,
			updated_at = NOW()
		WHERE id = ANY($1)
	`, transactionIDs)
	return err
}

func (r *Repository) ListSubscriptions(ctx context.Context, userID uuid.UUID) ([]*model.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, amount, currency, category_id, recurrence, usage_index, is_active, recommendation, created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.Subscription, 0)
	for rows.Next() {
		var item model.Subscription
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Name,
			&item.Amount,
			&item.Currency,
			&item.CategoryID,
			&item.Recurrence,
			&item.UsageIndex,
			&item.IsActive,
			&item.Recommendation,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, &item)
	}

	return result, rows.Err()
}
