package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"finapp/services/data-processing/processing/internal/model"
)

type MLClient struct {
	baseURL string
	client  *http.Client
}

type mlCategorizeRequest struct {
	Description   string   `json:"description"`
	Amount        *float64 `json:"amount,omitempty"`
	Merchant      *string  `json:"merchant,omitempty"`
	OperationType string   `json:"operation_type"`
}

type mlCategorizeResponse struct {
	CategoryCode string  `json:"category_code"`
	CategoryName string  `json:"category_name"`
	Confidence   float64 `json:"confidence"`
	ModelVersion string  `json:"model_version"`
}

func NewMLClient(baseURL string) *MLClient {
	return &MLClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: 8 * time.Second},
	}
}

func (c *MLClient) Categorize(ctx context.Context, tx *model.Transaction) (category string, confidence float64, recurring bool, err error) {
	if c == nil || c.baseURL == "" {
		return "", 0, false, fmt.Errorf("ml client is not configured")
	}

	description := strings.TrimSpace(joinText(tx.Description, tx.OriginalDescription))
	if description == "" {
		description = "Операция"
	}
	payload := mlCategorizeRequest{
		Description:   description,
		Amount:        &tx.Amount,
		OperationType: operationType(tx.Type),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", 0, false, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v1/categorize", bytes.NewReader(body))
	if err != nil {
		return "", 0, false, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", 0, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", 0, false, fmt.Errorf("ml categorize failed: status %d", resp.StatusCode)
	}

	var decoded mlCategorizeResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return "", 0, false, err
	}
	if strings.TrimSpace(decoded.CategoryName) == "" {
		return "", 0, false, fmt.Errorf("ml categorize returned empty category")
	}

	return decoded.CategoryName, decoded.Confidence, decoded.CategoryCode == "subscriptions" || strings.EqualFold(decoded.CategoryName, "Подписки"), nil
}

func operationType(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "INCOME":
		return "income"
	case "TRANSFER":
		return "transfer"
	case "EXPENSE":
		return "expense"
	default:
		return "unknown"
	}
}
