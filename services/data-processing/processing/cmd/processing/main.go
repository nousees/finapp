package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"finapp/services/data-processing/processing/internal/api"
	"finapp/services/data-processing/processing/internal/config"
	"finapp/services/data-processing/processing/internal/middleware"
	"finapp/services/data-processing/processing/internal/repository"
	"finapp/services/data-processing/processing/internal/service"

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

	repo := repository.New(pool)
	svc := service.New(repo)
	handler := api.NewHandler(svc)

	router := gin.Default()

	apiGroup := router.Group("/api/v1")
	apiGroup.Use(middleware.JWTAuth(cfg.JWT.Secret))
	{
		apiGroup.POST("/process/:id", handler.ProcessOne)
		apiGroup.POST("/categorize-batch", handler.ProcessBatch)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "processing"})
	})

	server := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
