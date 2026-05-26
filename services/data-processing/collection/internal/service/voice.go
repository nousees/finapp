package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"finapp/services/data-processing/collection/internal/model"
	"finapp/services/data-processing/collection/internal/repository"

	"github.com/google/uuid"
)

type VoiceService struct {
	repo             *repository.VoiceRepo
	transRepo        *repository.TransactionRepo
	processingClient *ProcessingClient
	mlBaseURL        string
	client           *http.Client
}

func NewVoiceService(repo *repository.VoiceRepo, transRepo *repository.TransactionRepo, processingClient *ProcessingClient, mlBaseURL string) *VoiceService {
	return &VoiceService{
		repo:             repo,
		transRepo:        transRepo,
		processingClient: processingClient,
		mlBaseURL:        mlBaseURL,
		client:           &http.Client{},
	}
}

// Upload accepts audio, sends it to the ML voice endpoint and persists the transcription.
func (s *VoiceService) Upload(ctx context.Context, userID uuid.UUID, audioBody io.Reader, contentType string, audioURL *string) (*model.VoiceTranscription, error) {
	var payload bytes.Buffer
	writer := multipart.NewWriter(&payload)
	part, err := writer.CreateFormFile("file", voiceUploadFilename(contentType))
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(part, audioBody); err != nil {
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.mlBaseURL+"/api/v1/voice/transcribe", &payload)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if contentType != "" {
		req.Header.Set("X-Original-Content-Type", contentType)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		entities, _ := json.Marshal(map[string]interface{}{"error": err.Error()})
		return s.repo.Create(ctx, userID, audioURL, "", entities, model.VoiceFailed)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		entities, _ := json.Marshal(map[string]interface{}{"error": string(body), "status": resp.StatusCode})
		return s.repo.Create(ctx, userID, audioURL, "", entities, model.VoiceFailed)
	}

	var mlResp model.MLTranscribeResponse
	if err := json.NewDecoder(resp.Body).Decode(&mlResp); err != nil {
		return nil, fmt.Errorf("decode ML response: %w", err)
	}

	entities, _ := json.Marshal(map[string]interface{}{
		"language":   mlResp.Language,
		"confidence": mlResp.Confidence,
	})

	return s.repo.Create(ctx, userID, audioURL, mlResp.Text, entities, model.VoicePending)
}

func voiceUploadFilename(contentType string) string {
	lowered := strings.ToLower(contentType)
	switch {
	case strings.Contains(lowered, "wav"):
		return "voice-upload.wav"
	case strings.Contains(lowered, "mpeg"), strings.Contains(lowered, "mp3"):
		return "voice-upload.mp3"
	case strings.Contains(lowered, "ogg"), strings.Contains(lowered, "opus"):
		return "voice-upload.ogg"
	default:
		return "voice-upload.m4a"
	}
}

// UploadFromBytes is a multipart-friendly helper for handler uploads.
func (s *VoiceService) UploadFromBytes(ctx context.Context, userID uuid.UUID, audioData []byte, contentType string, audioURL *string) (*model.VoiceTranscription, error) {
	return s.Upload(ctx, userID, bytes.NewReader(audioData), contentType, audioURL)
}

func (s *VoiceService) BuildTransactionFromBytes(ctx context.Context, userID uuid.UUID, audioData []byte, contentType string, audioURL *string, autoCreate bool, authorization string) (*model.VoiceTransactionResponse, error) {
	voice, err := s.UploadFromBytes(ctx, userID, audioData, contentType, audioURL)
	if err != nil {
		return nil, err
	}
	if voice.Status == model.VoiceFailed {
		return &model.VoiceTransactionResponse{Voice: voice}, nil
	}

	enriched, err := s.enrichText(ctx, voice.TranscribedText)
	if err != nil {
		return nil, err
	}

	response := &model.VoiceTransactionResponse{
		Voice:    voice,
		Enriched: enriched,
	}
	if !autoCreate || enriched.Transaction.Amount == nil {
		return response, nil
	}

	txDate := time.Now().UTC()
	if enriched.Transaction.Date != nil && *enriched.Transaction.Date != "" {
		if parsed, err := time.Parse("2006-01-02", *enriched.Transaction.Date); err == nil {
			txDate = parsed.UTC()
		}
	}
	txType := model.TypeExpense
	switch strings.ToLower(string(enriched.Transaction.OperationType)) {
	case "income":
		txType = model.TypeIncome
	case "transfer":
		txType = model.TypeTransfer
	}
	description := enriched.Transaction.Description
	input := model.CreateTransactionInput{
		Amount:      *enriched.Transaction.Amount,
		Currency:    enriched.Transaction.Currency,
		Type:        txType,
		Description: &description,
	}
	if input.Currency == "" {
		input.Currency = "RUB"
	}
	tx, err := s.transRepo.Create(ctx, userID, input, txDate)
	if err != nil {
		return nil, err
	}
	_ = s.repo.UpdateTransactionID(ctx, voice.ID, tx.ID)
	if s.processingClient != nil {
		_ = s.processingClient.ProcessTransaction(ctx, tx.ID, authorization)
	}
	response.Transaction = tx
	return response, nil
}

func (s *VoiceService) enrichText(ctx context.Context, text string) (*model.MLEnrichResponse, error) {
	body, err := json.Marshal(map[string]string{"text": text})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.mlBaseURL+"/api/v1/enrich", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ML enrich failed: status %d: %s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}
	var decoded model.MLEnrichResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	return &decoded, nil
}
