package repository

import (
	"context"
	"encoding/json"

	"finapp/services/data-processing/collection/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ImportRepo struct {
	pool *pgxpool.Pool
}

func NewImportRepo(pool *pgxpool.Pool) *ImportRepo {
	return &ImportRepo{pool: pool}
}

func (r *ImportRepo) Create(ctx context.Context, userID uuid.UUID, fileName string, fileType model.ImportFileType) (*model.Import, error) {
	id := uuid.New()
	status := model.ImportPending
	var imp model.Import
	err := r.pool.QueryRow(ctx, `
		INSERT INTO imports (id, user_id, file_name, file_type, status, processed_records)
		VALUES ($1, $2, $3, $4, $5, 0)
		RETURNING id, user_id, file_name, file_type, status, total_records, processed_records, errors, created_at
	`, id, userID, fileName, fileType, status).Scan(
		&imp.ID, &imp.UserID, &imp.FileName, &imp.FileType, &imp.Status,
		&imp.TotalRecords, &imp.ProcessedRecords, &imp.Errors, &imp.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &imp, nil
}

func (r *ImportRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Import, error) {
	var imp model.Import
	var total *int
	var errBytes []byte
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, file_name, file_type, status, total_records, processed_records, errors, created_at
		FROM imports WHERE id = $1
	`, id).Scan(&imp.ID, &imp.UserID, &imp.FileName, &imp.FileType, &imp.Status,
		&total, &imp.ProcessedRecords, &errBytes, &imp.CreatedAt)
	if err != nil {
		return nil, err
	}
	imp.TotalRecords = total
	imp.Errors = errBytes
	return &imp, nil
}

func (r *ImportRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status model.ImportStatus, total, processed int, errs []map[string]interface{}) error {
	var errJSON []byte
	if len(errs) > 0 {
		errJSON, _ = json.Marshal(errs)
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE imports SET status = $1, total_records = $2, processed_records = $3, errors = $4
		WHERE id = $5
	`, status, total, processed, errJSON, id)
	return err
}
