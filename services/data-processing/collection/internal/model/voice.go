package model

import (
	"time"

	"github.com/google/uuid"
)

type VoiceStatus string

const (
	VoicePending   VoiceStatus = "PENDING"
	VoiceProcessed VoiceStatus = "PROCESSED"
	VoiceFailed    VoiceStatus = "FAILED"
)

type VoiceTranscription struct {
	ID             uuid.UUID    `json:"id"`
	UserID         uuid.UUID    `json:"user_id"`
	AudioFileURL   *string      `json:"audio_file_url,omitempty"`
	TranscribedText string      `json:"transcribed_text"`
	Entities       []byte      `json:"entities,omitempty"` // JSONB: сумма, категория, место
	MLCategoryID   *uuid.UUID   `json:"ml_category_id,omitempty"`
	Confidence     *float64     `json:"confidence,omitempty"`
	Status         VoiceStatus  `json:"status"`
	TransactionID  *uuid.UUID   `json:"transaction_id,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
}

// MLTranscribeResponse — ответ ML-сервиса POST /transcribe
type MLTranscribeResponse struct {
	Text     string                 `json:"text"`
	Entities map[string]interface{} `json:"entities,omitempty"`
}
