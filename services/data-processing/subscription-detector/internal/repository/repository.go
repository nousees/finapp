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
	statements := []string{
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS recommendation TEXT`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_confidence DECIMAL(5,4) DEFAULT 0.5`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS recommendation_confidence DECIMAL(5,4) DEFAULT 0`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS budget_impact DECIMAL(5,4) DEFAULT 0`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS related_activity_index DECIMAL(5,4) DEFAULT 0`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_feedback_score DECIMAL(5,4)`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'needs_review'`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS recommendation_type VARCHAR(40)`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS evidence_summary TEXT DEFAULT ''`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_action TEXT DEFAULT ''`,
		`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_billing_date DATE`,
		`ALTER TABLE subscriptions ALTER COLUMN next_billing_date DROP NOT NULL`,
		`ALTER TABLE subscriptions ALTER COLUMN usage_index TYPE DECIMAL(5,2)`,
		`CREATE TABLE IF NOT EXISTS subscription_feedback (
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			subscription_name VARCHAR(200) NOT NULL,
			usage_frequency VARCHAR(20) NOT NULL,
			importance VARCHAR(20) NOT NULL DEFAULT 'medium',
			decision VARCHAR(40) NOT NULL DEFAULT 'none',
			feedback_score DECIMAL(5,4) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (user_id, subscription_name)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_subscription_feedback_user_updated ON subscription_feedback(user_id, updated_at DESC)`,
	}

	for _, statement := range statements {
		if _, err := r.pool.Exec(ctx, statement); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ListExpenseTransactions(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.Transaction, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, amount, currency, COALESCE(category_id, ml_category_id) AS category_id, description, original_description, date
		FROM transactions
		WHERE user_id = $1
			AND UPPER(type) = 'EXPENSE'
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

func (r *Repository) ListFeedback(ctx context.Context, userID uuid.UUID) (map[string]*model.SubscriptionFeedback, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT user_id, subscription_name, usage_frequency, importance, decision, feedback_score, created_at, updated_at
		FROM subscription_feedback
		WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]*model.SubscriptionFeedback)
	for rows.Next() {
		var item model.SubscriptionFeedback
		if err := rows.Scan(
			&item.UserID,
			&item.SubscriptionName,
			&item.UsageFrequency,
			&item.Importance,
			&item.Decision,
			&item.FeedbackScore,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result[item.SubscriptionName] = &item
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
				id, user_id, name, amount, currency, category_id, recurrence, usage_index,
				subscription_confidence, recommendation_confidence, budget_impact, related_activity_index,
				user_feedback_score, status, recommendation_type, evidence_summary, next_action,
				is_active, recommendation
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		`,
			item.ID, item.UserID, item.Name, item.Amount, item.Currency, item.CategoryID,
			item.Recurrence, item.UsageIndex, item.SubscriptionConfidence, item.RecommendationConfidence,
			item.BudgetImpact, item.RelatedActivityIndex, item.UserFeedbackScore, item.Status,
			item.RecommendationType, item.EvidenceSummary, item.NextAction, item.IsActive, item.Recommendation,
		); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetSubscription(ctx context.Context, userID, subscriptionID uuid.UUID) (*model.Subscription, error) {
	var item model.Subscription
	if err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, name, amount, currency, category_id, recurrence, usage_index,
			COALESCE(subscription_confidence, 0.5), COALESCE(recommendation_confidence, 0),
			COALESCE(budget_impact, 0), COALESCE(related_activity_index, 0), user_feedback_score,
			COALESCE(status, 'needs_review'), recommendation_type, COALESCE(evidence_summary, ''),
			COALESCE(next_action, ''), is_active, recommendation, created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1 AND id = $2
	`, userID, subscriptionID).Scan(
		&item.ID,
		&item.UserID,
		&item.Name,
		&item.Amount,
		&item.Currency,
		&item.CategoryID,
		&item.Recurrence,
		&item.UsageIndex,
		&item.SubscriptionConfidence,
		&item.RecommendationConfidence,
		&item.BudgetImpact,
		&item.RelatedActivityIndex,
		&item.UserFeedbackScore,
		&item.Status,
		&item.RecommendationType,
		&item.EvidenceSummary,
		&item.NextAction,
		&item.IsActive,
		&item.Recommendation,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) UpsertFeedback(ctx context.Context, item *model.SubscriptionFeedback) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO subscription_feedback (user_id, subscription_name, usage_frequency, importance, decision, feedback_score)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, subscription_name) DO UPDATE SET
			usage_frequency = EXCLUDED.usage_frequency,
			importance = EXCLUDED.importance,
			decision = EXCLUDED.decision,
			feedback_score = EXCLUDED.feedback_score,
			updated_at = NOW()
	`, item.UserID, item.SubscriptionName, item.UsageFrequency, item.Importance, item.Decision, item.FeedbackScore); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE subscriptions
		SET user_feedback_score = $3,
			updated_at = NOW()
		WHERE user_id = $1 AND name = $2
	`, item.UserID, item.SubscriptionName, item.FeedbackScore); err != nil {
		return err
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
		SELECT id, user_id, name, amount, currency, category_id, recurrence, usage_index,
			COALESCE(subscription_confidence, 0.5), COALESCE(recommendation_confidence, 0),
			COALESCE(budget_impact, 0), COALESCE(related_activity_index, 0), user_feedback_score,
			COALESCE(status, 'needs_review'), recommendation_type, COALESCE(evidence_summary, ''),
			COALESCE(next_action, ''), is_active, recommendation, created_at, updated_at
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
			&item.SubscriptionConfidence,
			&item.RecommendationConfidence,
			&item.BudgetImpact,
			&item.RelatedActivityIndex,
			&item.UserFeedbackScore,
			&item.Status,
			&item.RecommendationType,
			&item.EvidenceSummary,
			&item.NextAction,
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
