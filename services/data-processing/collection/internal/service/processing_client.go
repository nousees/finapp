package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ProcessingClient struct {
	baseURL string
	client  *http.Client
}

func NewProcessingClient(baseURL string) *ProcessingClient {
	return &ProcessingClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *ProcessingClient) ProcessTransaction(ctx context.Context, transactionID uuid.UUID, authorization string) error {
	if c == nil || c.baseURL == "" || authorization == "" {
		return nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v1/process/"+transactionID.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", authorization)

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("processing returned status %d", resp.StatusCode)
	}
	return nil
}
