package controllers

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/usecases"
	"finapp/services/data-processing/auth-service/pkg/supabase"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type VerifyEmailCodeController struct {
	SignInUsecase usecases.SignInUsecase
	Supabase      *supabase.Client
}

type VerifyEmailCodeInput struct {
	Email    string `json:"email" validate:"required,email"`
	Code     string `json:"code" validate:"required,len=6,numeric"`
	Password string `json:"password" validate:"required,min=8"`
}

func NewVerifyEmailCodeController(sin usecases.SignInUsecase, sp *supabase.Client) *VerifyEmailCodeController {
	return &VerifyEmailCodeController{SignInUsecase: sin, Supabase: sp}
}

func (vc *VerifyEmailCodeController) Verify(c *gin.Context) {
	var input VerifyEmailCodeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "bad request", "error": err.Error()})
		return
	}
	if err := validator.New().Struct(input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "validation error", "error": err.Error()})
		return
	}
	if err := vc.Supabase.VerifyEmailOTP(input.Email, input.Code); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "verification failed", "error": err.Error()})
		return
	}
	accessToken, refreshToken, expiresIn, err := vc.SignInUsecase.SignIn(entities.SignInInput{Email: input.Email, Password: input.Password})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "authorization error", "error": err.Error()})
		return
	}
	userData, err := vc.SignInUsecase.GetUserByEmail(input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to get user data", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "access_token": accessToken, "refresh_token": refreshToken, "token_type": "Bearer", "expires_in": expiresIn, "user": gin.H{"id": userData.ID, "email": userData.Email, "full_name": userData.FullName, "phone": userData.Phone}})
}
