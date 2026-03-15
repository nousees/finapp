package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"finapp/services/data-processing/collection/internal/config"
	"finapp/services/data-processing/collection/internal/handler"
	"finapp/services/data-processing/collection/internal/middleware"
	"finapp/services/data-processing/collection/internal/repository"
	"finapp/services/data-processing/collection/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, cfg.Database.DSN)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("database ping: %v", err)
	}

	// Repositories
	transRepo := repository.NewTransactionRepo(pool)
	importRepo := repository.NewImportRepo(pool)
	voiceRepo := repository.NewVoiceRepo(pool)

	// Services
	transSvc := service.NewTransactionService(transRepo)
	importSvc := service.NewImportService(importRepo, transRepo)
	voiceSvc := service.NewVoiceService(voiceRepo, cfg.ML.BaseURL)

	// Handlers
	transHandler := handler.NewTransactionHandler(transSvc)
	importHandler := handler.NewImportHandler(importSvc)
	voiceHandler := handler.NewVoiceHandler(voiceSvc)

	router := gin.Default()
	router.Use(middleware.JWTAuth(cfg.JWT.Secret))

	api := router.Group("/api/v1")
	{
		api.GET("/transactions", transHandler.List)
		api.POST("/transactions", transHandler.Create)
		api.POST("/transactions/batch", transHandler.CreateBatch)
		api.PATCH("/transactions/:id", transHandler.Update)
		api.POST("/import", importHandler.Import)
		api.POST("/voice/upload", voiceHandler.Upload)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "collection"})
	})

	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	log.Println("collection exited")
}
