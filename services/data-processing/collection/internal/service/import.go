package service

import (
	"context"
	"encoding/csv"
	"io"
	"strconv"
	"strings"
	"time"

	"finapp/services/data-processing/collection/internal/model"
	"finapp/services/data-processing/collection/internal/repository"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

type ImportService struct {
	importRepo *repository.ImportRepo
	transRepo  *repository.TransactionRepo
}

func NewImportService(importRepo *repository.ImportRepo, transRepo *repository.TransactionRepo) *ImportService {
	return &ImportService{importRepo: importRepo, transRepo: transRepo}
}

func (s *ImportService) StartImport(ctx context.Context, userID uuid.UUID, fileName string, fileType model.ImportFileType) (*model.Import, error) {
	return s.importRepo.Create(ctx, userID, fileName, fileType)
}

func parseImportDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Now().UTC(), nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02", "02.01.2006", "02.01.2006 15:04", "02.01.2006 15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Now().UTC(), nil
}

func (s *ImportService) ProcessCSV(ctx context.Context, userID uuid.UUID, importID uuid.UUID, body io.Reader) (processed int, errs []map[string]interface{}, err error) {
	_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportProcessing, 0, 0, nil)
	reader := csv.NewReader(body)
	reader.Comma = ';'
	reader.FieldsPerRecord = -1
	rows, err := reader.ReadAll()
	if err != nil {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportFailed, 0, 0, []map[string]interface{}{{"error": err.Error()}})
		return 0, nil, err
	}
	total := len(rows)
	if total <= 1 {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportCompleted, total-1, 0, nil)
		return 0, nil, nil
	}
	headers := rows[0]
	dateIdx, amountIdx, typeIdx, descIdx := findColumnIndices(headers)
	if dateIdx < 0 || amountIdx < 0 {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportFailed, 0, 0, []map[string]interface{}{{"error": "required columns (date, amount) not found"}})
		return 0, nil, err
	}
	var processedCount int
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		amountStr := ""
		if amountIdx < len(row) {
			amountStr = strings.TrimSpace(strings.Replace(row[amountIdx], ",", ".", 1))
		}
		amount, parseErr := strconv.ParseFloat(amountStr, 64)
		if parseErr != nil {
			errs = append(errs, map[string]interface{}{"row": i + 1, "error": "invalid amount", "value": amountStr})
			continue
		}
		typeStr := "EXPENSE"
		if typeIdx >= 0 && typeIdx < len(row) {
			typeStr = strings.TrimSpace(strings.ToUpper(row[typeIdx]))
		}
		if typeStr != "INCOME" && typeStr != "TRANSFER" {
			typeStr = "EXPENSE"
		}
		descStr := ""
		if descIdx >= 0 && descIdx < len(row) {
			descStr = strings.TrimSpace(row[descIdx])
		}
		dateStr := ""
		if dateIdx < len(row) {
			dateStr = strings.TrimSpace(row[dateIdx])
		}
		txDate, _ := parseImportDate(dateStr)
		in := model.CreateTransactionInput{
			Amount:      amount,
			Currency:    "RUB",
			Type:        model.TransactionType(typeStr),
			Description: &descStr,
			Date:        &dateStr,
		}
		if descStr == "" {
			in.Description = nil
		}
		_, createErr := s.transRepo.Create(ctx, userID, in, txDate)
		if createErr != nil {
			errs = append(errs, map[string]interface{}{"row": i + 1, "error": createErr.Error()})
			continue
		}
		processedCount++
	}
	_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportCompleted, total-1, processedCount, errs)
	return processedCount, errs, nil
}

func findColumnIndices(headers []string) (dateIdx, amountIdx, typeIdx, descIdx int) {
	dateIdx, amountIdx, typeIdx, descIdx = -1, -1, -1, -1
	for i, h := range headers {
		h = strings.ToLower(strings.TrimSpace(h))
		switch {
		case strings.Contains(h, "date") || h == "дата":
			dateIdx = i
		case strings.Contains(h, "amount") || strings.Contains(h, "sum") || h == "сумма":
			amountIdx = i
		case strings.Contains(h, "type") || h == "тип":
			typeIdx = i
		case strings.Contains(h, "desc") || strings.Contains(h, "comment") || h == "описание":
			descIdx = i
		}
	}
	return dateIdx, amountIdx, typeIdx, descIdx
}

func (s *ImportService) ProcessExcel(ctx context.Context, userID uuid.UUID, importID uuid.UUID, body io.Reader) (processed int, errs []map[string]interface{}, err error) {
	_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportProcessing, 0, 0, nil)
	f, err := excelize.OpenReader(body)
	if err != nil {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportFailed, 0, 0, []map[string]interface{}{{"error": err.Error()}})
		return 0, nil, err
	}
	defer f.Close()
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportCompleted, 0, 0, nil)
		return 0, nil, nil
	}
	rows, err := f.GetRows(sheets[0])
	if err != nil {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportFailed, 0, 0, []map[string]interface{}{{"error": err.Error()}})
		return 0, nil, err
	}
	if len(rows) <= 1 {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportCompleted, 0, 0, nil)
		return 0, nil, nil
	}
	headers := rows[0]
	dateIdx, amountIdx, typeIdx, descIdx := findColumnIndices(headers)
	if dateIdx < 0 || amountIdx < 0 {
		_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportFailed, 0, 0, []map[string]interface{}{{"error": "required columns (date, amount) not found"}})
		return 0, nil, err
	}
	total := len(rows) - 1
	processedCount := 0
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		amountStr := ""
		if amountIdx < len(row) {
			amountStr = strings.TrimSpace(strings.Replace(row[amountIdx], ",", ".", 1))
		}
		amount, parseErr := strconv.ParseFloat(amountStr, 64)
		if parseErr != nil {
			errs = append(errs, map[string]interface{}{"row": i + 1, "error": "invalid amount", "value": amountStr})
			continue
		}
		typeStr := "EXPENSE"
		if typeIdx >= 0 && typeIdx < len(row) {
			typeStr = strings.TrimSpace(strings.ToUpper(row[typeIdx]))
		}
		if typeStr != "INCOME" && typeStr != "TRANSFER" {
			typeStr = "EXPENSE"
		}
		descStr := ""
		if descIdx >= 0 && descIdx < len(row) {
			descStr = strings.TrimSpace(row[descIdx])
		}
		dateStr := ""
		if dateIdx < len(row) {
			dateStr = strings.TrimSpace(row[dateIdx])
		}
		txDate, _ := parseImportDate(dateStr)
		in := model.CreateTransactionInput{
			Amount:      amount,
			Currency:    "RUB",
			Type:        model.TransactionType(typeStr),
			Description: &descStr,
			Date:        &dateStr,
		}
		if descStr == "" {
			in.Description = nil
		}
		_, createErr := s.transRepo.Create(ctx, userID, in, txDate)
		if createErr != nil {
			errs = append(errs, map[string]interface{}{"row": i + 1, "error": createErr.Error()})
			continue
		}
		processedCount++
	}
	_ = s.importRepo.UpdateStatus(ctx, importID, model.ImportCompleted, total, processedCount, errs)
	return processedCount, errs, nil
}
