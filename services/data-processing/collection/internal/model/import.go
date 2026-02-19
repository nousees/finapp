package model

import (
	"time"

	"github.com/google/uuid"
)

type ImportFileType string

const (
	ImportCSV   ImportFileType = "CSV"
	ImportExcel ImportFileType = "EXCEL"
	ImportJSON  ImportFileType = "JSON"
)

type ImportStatus string

const (
	ImportPending    ImportStatus = "PENDING"
	ImportProcessing ImportStatus = "PROCESSING"
	ImportCompleted  ImportStatus = "COMPLETED"
	ImportFailed     ImportStatus = "FAILED"
)

type Import struct {
	ID               uuid.UUID     `json:"id"`
	UserID           uuid.UUID     `json:"user_id"`
	FileName         string        `json:"file_name"`
	FileType         ImportFileType `json:"file_type"`
	Status           ImportStatus  `json:"status"`
	TotalRecords     *int          `json:"total_records,omitempty"`
	ProcessedRecords int          `json:"processed_records"`
	Errors           []byte       `json:"errors,omitempty"` // JSONB
	CreatedAt        time.Time    `json:"created_at"`
}

type ImportRecord struct {
	Amount      float64  `json:"amount"`
	Type        string   `json:"type"` // INCOME, EXPENSE, TRANSFER
	Description string   `json:"description"`
	Date        string   `json:"date"`
	Category    string   `json:"category,omitempty"`
	Currency    string   `json:"currency,omitempty"`
}
