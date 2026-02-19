package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"finapp/services/data-processing/collection/internal/model"
	"finapp/services/data-processing/collection/internal/repository"

	"github.com/google/uuid"
)

var defaultDateFormats = []string{
	time.RFC3339,
	"2006-01-02",
	"02.01.2006",
	"02.01.2006 15:04",
}

type TransactionService struct {
	repo *repository.TransactionRepo
}

func NewTransactionService(repo *repository.TransactionRepo) *TransactionService {
	return &TransactionService{repo: repo}
}

func (s *TransactionService) parseDate(spec string) (time.Time, error) {
	spec = strings.TrimSpace(spec)
	if spec == "" {
		return time.Now().UTC(), nil
	}
	for _, layout := range defaultDateFormats {
		if t, err := time.Parse(layout, spec); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported date format: %q", spec)
}

func (s *TransactionService) Create(ctx context.Context, userID uuid.UUID, in model.CreateTransactionInput) (*model.Transaction, error) {
	txDate := time.Now().UTC()
	if in.Date != nil && *in.Date != "" {
		parsed, err := s.parseDate(*in.Date)
		if err != nil {
			return nil, err
		}
		txDate = parsed
	}
	return s.repo.Create(ctx, userID, in, txDate)
}

func (s *TransactionService) CreateBatch(ctx context.Context, userID uuid.UUID, in model.CreateTransactionBatchInput) ([]*model.Transaction, error) {
	return s.repo.CreateBatch(ctx, userID, in.Transactions, s.parseDate)
}
