package main

import (
	"finapp/services/data-processing/auth-service/config"
	"finapp/services/data-processing/auth-service/controllers"
	"finapp/services/data-processing/auth-service/internal/database"
	"finapp/services/data-processing/auth-service/internal/repository"
	"finapp/services/data-processing/auth-service/internal/usecases"
	"finapp/services/data-processing/auth-service/pkg/jwt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	db, err := database.NewPostgresConnection(cfg.DB)
	if err != nil {
		log.Fatal("Failed to connect to db: ", err)
	}

	tokens, err := jwt.NewManager(cfg.JWT.Secret, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL, cfg.JWT.Issuer)
	if err != nil {
		log.Fatal("Failed to init jwt: ", err)
	}

	users := repository.NewUsers(db.Pool)
	signUpUsecase := usecases.NewSignUpUsecase(users)
	signInUsecase := usecases.NewSignInUsecase(users, tokens)
	changePasswordUsecase := usecases.NewChangePasswordUsecase(users)

	signInController := controllers.NewSignInController(*signInUsecase)
	signUpController := controllers.NewSignUpController(*signUpUsecase, *signInUsecase)
	changePasswordController := controllers.NewChangePasswordController(*changePasswordUsecase)
	refreshController := controllers.NewRefreshController(tokens)

	router := gin.Default()

	// CORS middleware - разрешаем все источники для разработки и Expo
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	router.POST("/sign-up", signUpController.SignUp)
	router.POST("/sign-in", signInController.SignIn)
	router.POST("/refresh", refreshController.Refresh)
	router.POST("/change-password", func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		tokenString := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		if tokenString == "" || tokenString == header {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "missing bearer token"})
			c.Abort()
			return
		}
		userID, err := tokens.Parse(tokenString, "access")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "invalid token", "error": err.Error()})
			c.Abort()
			return
		}
		c.Set("user_id", userID)
		changePasswordController.ChangePassword(c)
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "auth"})
	})

	if err := router.Run(":" + cfg.Server.Port); err != nil {
		log.Fatal("Failed to start auth service: ", err)
	}
}
