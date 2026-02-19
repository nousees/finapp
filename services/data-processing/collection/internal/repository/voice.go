package repository

import (
	"context"

	"finapp/services/data-processing/collection/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VoiceRepo struct {
	pool *pgxpool.Pool
}

func NewVoiceRepo(pool *pgxpool.Pool) *VoiceRepo {
	return &VoiceRepo{pool: pool}
}

func (r *VoiceRepo) Create(ctx context.Context, userID uuid.UUID, audioURL *string, text string, entities []byte, status model.VoiceStatus) (*model.VoiceTranscription, error) {
	id := uuid.New()
	var vt model.VoiceTranscription
	err := r.pool.QueryRow(ctx, `
		INSERT INTO voice_transcriptions (id, user_id, audio_file_url, transcribed_text, entities, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, audio_file_url, transcribed_text, entities, ml_category_id, confidence, status, transaction_id, created_at
	`, id, userID, audioURL, text, entities, status).Scan(
		&vt.ID, &vt.UserID, &vt.AudioFileURL, &vt.TranscribedText, &vt.Entities,
		&vt.MLCategoryID, &vt.Confidence, &vt.Status, &vt.TransactionID, &vt.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &vt, nil
}

func (r *VoiceRepo) UpdateTransactionID(ctx context.Context, id, transactionID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE voice_transcriptions SET transaction_id = $1, status = 'PROCESSED' WHERE id = $2
	`, transactionID, id)
	return err
}
