package handler

import (
	"net/http"
	"strconv"

	"finapp/services/data-processing/collection/internal/model"
	"finapp/services/data-processing/collection/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TransactionHandler struct {
	svc *service.TransactionService
}

func NewTransactionHandler(svc *service.TransactionService) *TransactionHandler {
	return &TransactionHandler{svc: svc}
}

// Create создаёт одну транзакцию (ручной ввод).
// POST /transactions
func (h *TransactionHandler) Create(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user id required"})
		return
	}
	var in model.CreateTransactionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t, err := h.svc.Create(c.Request.Context(), userID, in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

// CreateBatch создаёт несколько транзакций.
// POST /transactions/batch
func (h *TransactionHandler) CreateBatch(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user id required"})
		return
	}
	var in model.CreateTransactionBatchInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	list, err := h.svc.CreateBatch(c.Request.Context(), userID, in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"transactions": list, "count": len(list)})
}

func (h *TransactionHandler) List(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user id required"})
		return
	}

	filter := model.ListTransactionsFilter{
		Query: c.Query("q"),
		Type:  model.TransactionType(c.Query("type")),
		Limit: 50,
	}

	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Limit = parsed
		}
	}
	if v := c.Query("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			filter.Offset = parsed
		}
	}
	if categoryID := c.Query("category_id"); categoryID != "" {
		if parsed, err := uuid.Parse(categoryID); err == nil {
			filter.CategoryID = &parsed
		}
	}

	items, err := h.svc.List(c.Request.Context(), userID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"transactions": items, "count": len(items)})
}

func (h *TransactionHandler) Update(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user id required"})
		return
	}
	transactionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction id"})
		return
	}

	var in model.UpdateTransactionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.svc.Update(c.Request.Context(), userID, transactionID, in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func userIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	v, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}
