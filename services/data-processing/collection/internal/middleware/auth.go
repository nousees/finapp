package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const userIDKey = "user_id"

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// JWTAuth проверяет Bearer токен и кладёт user_id в контекст.
// Для локальной разработки поддерживается заголовок X-User-Id (если нет Authorization).
func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth != "" && strings.HasPrefix(auth, "Bearer ") {
			tokenStr := strings.TrimPrefix(auth, "Bearer ")
			token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
				return []byte(secret), nil
			})
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
				c.Abort()
				return
			}
			if claims, ok := token.Claims.(*Claims); ok && token.Valid && claims.UserID != "" {
				id, err := uuid.Parse(claims.UserID)
				if err == nil {
					c.Set(userIDKey, id)
					c.Next()
					return
				}
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			c.Abort()
			return
		}
		// Dev: X-User-Id
		if xUserID := c.GetHeader("X-User-Id"); xUserID != "" {
			id, err := uuid.Parse(xUserID)
			if err == nil {
				c.Set(userIDKey, id)
				c.Next()
				return
			}
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
		c.Abort()
	}
}
