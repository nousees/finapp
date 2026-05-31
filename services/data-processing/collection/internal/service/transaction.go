package service

import (
	"context"
	"encoding/json"
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

const largeExpenseNotificationThreshold = 50000

type TransactionService struct {
	repo             *repository.TransactionRepo
	processingClient *ProcessingClient
}

func NewTransactionService(repo *repository.TransactionRepo, processingClient *ProcessingClient) *TransactionService {
	return &TransactionService{
		repo:             repo,
		processingClient: processingClient,
	}
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

func (s *TransactionService) Create(ctx context.Context, userID uuid.UUID, in model.CreateTransactionInput, authorization string) (*model.Transaction, error) {
	txDate := time.Now().UTC()
	if in.Date != nil && *in.Date != "" {
		parsed, err := s.parseDate(*in.Date)
		if err != nil {
			return nil, err
		}
		txDate = parsed
	}
	item, err := s.repo.Create(ctx, userID, in, txDate)
	if err != nil {
		return nil, err
	}
	s.notifyTransactionEvents(ctx, item)
	if in.CategoryID != nil {
		return item, nil
	}
	return item, s.processIfNeeded(ctx, item.ID, authorization)
}

func (s *TransactionService) CreateBatch(ctx context.Context, userID uuid.UUID, in model.CreateTransactionBatchInput, authorization string) ([]*model.Transaction, error) {
	items, err := s.repo.CreateBatch(ctx, userID, in.Transactions, s.parseDate)
	if err != nil {
		return items, err
	}
	for index, item := range items {
		s.notifyTransactionEvents(ctx, item)
		if index < len(in.Transactions) && in.Transactions[index].CategoryID != nil {
			continue
		}
		if err := s.processIfNeeded(ctx, item.ID, authorization); err != nil {
			return items, err
		}
	}
	return items, nil
}

func (s *TransactionService) List(ctx context.Context, userID uuid.UUID, filter model.ListTransactionsFilter) ([]*model.Transaction, error) {
	return s.repo.List(ctx, userID, filter)
}

func (s *TransactionService) Update(ctx context.Context, userID, transactionID uuid.UUID, in model.UpdateTransactionInput) (*model.Transaction, error) {
	var txDate *time.Time
	if in.Date != nil && *in.Date != "" {
		parsed, err := s.parseDate(*in.Date)
		if err != nil {
			return nil, err
		}
		txDate = &parsed
	}
	return s.repo.Update(ctx, userID, transactionID, in, txDate)
}

func (s *TransactionService) processIfNeeded(ctx context.Context, transactionID uuid.UUID, authorization string) error {
	if s.processingClient == nil {
		return nil
	}
	return s.processingClient.ProcessTransaction(ctx, transactionID, authorization)
}

func (s *TransactionService) notifyTransactionEvents(ctx context.Context, tx *model.Transaction) {
	if tx == nil || tx.Type != model.TypeExpense || tx.Amount < largeExpenseNotificationThreshold {
		return
	}
	data, _ := json.Marshal(map[string]interface{}{
		"amount":        tx.Amount,
		"currency":      tx.Currency,
		"transactionId": tx.ID.String(),
	})
	title := "Крупная операция"
	message := fmt.Sprintf("Добавлен расход %.0f %s. Проверьте категорию и описание операции.", tx.Amount, tx.Currency)
	if err := s.repo.CreateNotification(ctx, tx.UserID, "LARGE_TRANSACTION", title, message, "GO", "transaction", tx.ID, string(data)); err != nil {
		// Notification creation must not block transaction entry.
		return
	}
}
