package controllers

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/usecases"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type ChangePasswordController struct {
	Usecase usecases.ChangePasswordUsecase
}

func NewChangePasswordController(usecase usecases.ChangePasswordUsecase) *ChangePasswordController {
	return &ChangePasswordController{Usecase: usecase}
}

func (cc *ChangePasswordController) ChangePassword(c *gin.Context) {
	rawUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "missing user context"})
		return
	}
	userID, ok := rawUserID.(uuid.UUID)
	if !ok || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "invalid user context"})
		return
	}

	var input entities.ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "bad request", "error": err.Error()})
		return
	}

	validate := validator.New()
	if err := validate.Struct(input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "validation error", "error": err.Error()})
		return
	}

	if err := cc.Usecase.ChangePassword(userID, input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "password change failed", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "password changed"})
}
