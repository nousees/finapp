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

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
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

	users := repository.NewUsers(db)
	signUpUsecase := usecases.NewSignUpUsecase(users)
	signInUsecase := usecases.NewSignInUsecase(users, tokens)

	signInController := controllers.NewSignInController(*signInUsecase)
	signUpController := controllers.NewSignUpController(*signUpUsecase)
	refreshController := controllers.NewRefreshController(tokens)

	router := gin.Default()

	router.POST("/sign-up", signUpController.SignUp)
	router.POST("/sign-in", signInController.SignIn)
	router.POST("/refresh", refreshController.Refresh)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "auth"})
	})

	router.Run(":" + cfg.Server.Port)
}
