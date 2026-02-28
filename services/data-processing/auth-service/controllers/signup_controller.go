package controllers

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/usecases"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type SignUpController struct {
	SignUpUsecase usecases.SignUpUsecase
}

func NewSignUpController(sup usecases.SignUpUsecase) *SignUpController {
	return &SignUpController{sup}
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

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "registration successfully"})
}
