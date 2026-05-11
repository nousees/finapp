package controllers

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/usecases"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type SignInController struct {
	SignInUsecase usecases.SignInUsecase
}

func NewSignInController(sin usecases.SignInUsecase) *SignInController {
	return &SignInController{sin}
}

func (sc *SignInController) SignIn(c *gin.Context) {
	var user entities.SignInInput
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "bad request", "error": err.Error()})
		return
	}

	validate := validator.New()
	if err := validate.Struct(user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "validation error", "error": err.Error()})
		return
	}

	accessToken, refreshToken, expiresIn, err := sc.SignInUsecase.SignIn(user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "authorization error", "error": err.Error()})
		return
	}

	// Получаем данные пользователя для ответа
	userData, err := sc.SignInUsecase.GetUserByEmail(user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to get user data", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       "authorization successfully",
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    expiresIn,
		"user": gin.H{
			"id":        userData.ID,
			"email":     userData.Email,
			"full_name": userData.FullName,
			"phone":     userData.Phone,
		},
	})
}
