package service

import (
	"context"

	"finapp/services/data-processing/processing/internal/model"
	"finapp/services/data-processing/processing/internal/repository"

	"github.com/google/uuid"
)

type Service struct {
	repo       *repository.Repository
	classifier Classifier
	mlClient   *MLClient
}

func New(repo *repository.Repository, mlClient *MLClient) *Service {
	return &Service{
		repo:       repo,
		classifier: NewRuleBasedClassifier(),
		mlClient:   mlClient,
	}
}

func (s *Service) ProcessOne(ctx context.Context, userID, transactionID uuid.UUID) (*model.ProcessResponse, error) {
	tx, err := s.repo.GetTransactionByID(ctx, userID, transactionID)
	if err != nil {
		return nil, err
	}

	categoryName, confidence, recurring, err := s.categorize(ctx, tx)
	if err != nil {
		return nil, err
	}
	category, err := s.repo.EnsureCategory(ctx, userID, categoryName, tx.Type)
	if err != nil {
		return nil, err
	}
	if err := s.repo.MarkCategorized(ctx, tx.ID, category.ID, confidence, recurring); err != nil {
		return nil, err
	}

	tx.CategoryID = &category.ID
	tx.MLCategoryID = &category.ID
	tx.MLConfidence = &confidence
	tx.IsVerified = true
	tx.IsRecurring = recurring

	return &model.ProcessResponse{
		Transaction: tx,
		Category:    category.Name,
		Confidence:  confidence,
	}, nil
}

func (s *Service) categorize(ctx context.Context, tx *model.Transaction) (string, float64, bool, error) {
	if s.mlClient != nil {
		categoryName, confidence, recurring, err := s.mlClient.Categorize(ctx, tx)
		if err == nil {
			return categoryName, confidence, recurring, nil
		}
	}
	categoryName, confidence, recurring := s.classifier.Classify(tx)
	return categoryName, confidence, recurring, nil
}

func (s *Service) ProcessBatch(ctx context.Context, userID uuid.UUID, ids []uuid.UUID, limit int) ([]*model.ProcessResponse, error) {
	var (
		txs []*model.Transaction
		err error
	)

	if len(ids) == 0 {
		txs, err = s.repo.ListUnverified(ctx, userID, limit)
		if err != nil {
			return nil, err
		}
	} else {
		for _, id := range ids {
			tx, err := s.repo.GetTransactionByID(ctx, userID, id)
			if err != nil {
				return nil, err
			}
			txs = append(txs, tx)
		}
	}

	result := make([]*model.ProcessResponse, 0, len(txs))
	for _, tx := range txs {
		item, err := s.ProcessOne(ctx, userID, tx.ID)
		if err != nil {
			return result, err
		}
		result = append(result, item)
	}

	return result, nil
}
