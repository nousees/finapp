package controllers

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/usecases"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type SignUpController struct {
	SignUpUsecase   usecases.SignUpUsecase
	SignInUsecase   usecases.SignInUsecase
	SupabaseEnabled bool
	SendEmailOTP    func(string) error
}

func NewSignUpController(sup usecases.SignUpUsecase, sin usecases.SignInUsecase, supabaseEnabled bool, sendEmailOTP func(string) error) *SignUpController {
	return &SignUpController{SignUpUsecase: sup, SignInUsecase: sin, SupabaseEnabled: supabaseEnabled, SendEmailOTP: sendEmailOTP}
}

func (sc *SignUpController) SignUp(c *gin.Context) {
	var user entities.SignUpInput
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "bad request", "error": err.Error()})
		return
	}

	validate := validator.New()
	if err := validate.Struct(user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "validation error", "error": err.Error()})
		return
	}

	err := sc.SignUpUsecase.SignUp(user)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"status": "error", "message": "registration error", "error": err.Error()})
		return
	}

	if sc.SupabaseEnabled && sc.SendEmailOTP != nil {
		if err := sc.SendEmailOTP(user.Email); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"status": "error", "message": "email verification send failed", "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":                      "success",
			"message":                     "registration successfully, verify email",
			"requires_email_verification": true,
		})
		return
	}

	// После успешной регистрации сразу логиним пользователя
	signInInput := entities.SignInInput{
		Email:    user.Email,
		Password: user.Password,
	}

	accessToken, refreshToken, expiresIn, err := sc.SignInUsecase.SignIn(signInInput)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "auto login failed", "error": err.Error()})
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
		"message":       "registration successfully",
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
