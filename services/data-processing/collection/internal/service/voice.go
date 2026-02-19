package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"finapp/services/data-processing/collection/internal/model"
	"finapp/services/data-processing/collection/internal/repository"

	"github.com/google/uuid"
)

type VoiceService struct {
	repo     *repository.VoiceRepo
	mlBaseURL string
	client   *http.Client
}

func NewVoiceService(repo *repository.VoiceRepo, mlBaseURL string) *VoiceService {
	return &VoiceService{
		repo:       repo,
		mlBaseURL:  mlBaseURL,
		client:     &http.Client{},
	}
}

// Upload принимает аудио, отправляет в ML /transcribe, сохраняет voice_transcriptions.
func (s *VoiceService) Upload(ctx context.Context, userID uuid.UUID, audioBody io.Reader, contentType string, audioURL *string) (*model.VoiceTranscription, error) {
	// Отправка в ML
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.mlBaseURL+"/transcribe", audioBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", contentType)
	resp, err := s.client.Do(req)
	if err != nil {
		// ML недоступен — сохраняем запись со статусом FAILED или пустым текстом
		text := ""
		entities, _ := json.Marshal(map[string]interface{}{"error": err.Error()})
		return s.repo.Create(ctx, userID, audioURL, text, entities, model.VoiceFailed)
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
	var entities []byte
	if mlResp.Entities != nil {
		entities, _ = json.Marshal(mlResp.Entities)
	}
	return s.repo.Create(ctx, userID, audioURL, mlResp.Text, entities, model.VoicePending)
}

// UploadFromBytes — то же, но из []byte (удобно для multipart).
func (s *VoiceService) UploadFromBytes(ctx context.Context, userID uuid.UUID, audioData []byte, contentType string, audioURL *string) (*model.VoiceTranscription, error) {
	return s.Upload(ctx, userID, bytes.NewReader(audioData), contentType, audioURL)
}
