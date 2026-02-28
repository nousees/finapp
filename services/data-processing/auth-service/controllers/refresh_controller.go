package controllers

import (
	"net/http"

	"finapp/services/data-processing/auth-service/pkg/jwt"

	"github.com/gin-gonic/gin"
)

type RefreshController struct {
	Tokens *jwt.Manager
}

func NewRefreshController(tokens *jwt.Manager) *RefreshController {
	return &RefreshController{Tokens: tokens}
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (rc *RefreshController) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "bad request", "error": err.Error()})
		return
	}

	userID, err := rc.Tokens.Parse(req.RefreshToken, "refresh")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "invalid refresh token", "error": err.Error()})
		return
	}

	accessToken, err := rc.Tokens.GenerateAccessToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "token generation error", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":       "success",
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   rc.Tokens.AccessTTLSeconds(),
	})
}
