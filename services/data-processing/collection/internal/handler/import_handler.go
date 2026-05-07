package handler

import (
	"net/http"
	"strings"

	"finapp/services/data-processing/collection/internal/model"
	"finapp/services/data-processing/collection/internal/service"

	"github.com/gin-gonic/gin"
)

type ImportHandler struct {
	svc *service.ImportService
}

func NewImportHandler(svc *service.ImportService) *ImportHandler {
	return &ImportHandler{svc: svc}
}

// Import загружает файл (CSV или Excel), создаёт запись в imports и обрабатывает строки в транзакции.
// POST /import
// Content-Type: multipart/form-data, file field: "file"
func (h *ImportHandler) Import(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user id required"})
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required: " + err.Error()})
		return
	}
	fileName := file.Filename
	fileType := model.ImportCSV
	if strings.HasSuffix(strings.ToLower(fileName), ".xlsx") || strings.HasSuffix(strings.ToLower(fileName), ".xls") {
		fileType = model.ImportExcel
	}
	imp, err := h.svc.StartImport(c.Request.Context(), userID, fileName, fileType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "open file: " + err.Error()})
		return
	}
	defer f.Close()
	var processed int
	var errs []map[string]interface{}
	switch fileType {
	case model.ImportExcel:
		processed, errs, err = h.svc.ProcessExcel(c.Request.Context(), userID, imp.ID, f)
	default:
		processed, errs, err = h.svc.ProcessCSV(c.Request.Context(), userID, imp.ID, f)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "import_id": imp.ID})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"import_id":         imp.ID,
		"status":            "COMPLETED",
		"processed_records": processed,
		"errors":            errs,
	})
}
