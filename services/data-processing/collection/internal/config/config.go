package config

import (
	"os"
	"strconv"
)

type Config struct {
	Server   Server
	Database Database
	ML       ML
	JWT      JWT
}

type Server struct {
	Port string
}

type Database struct {
	DSN string
}

type ML struct {
	BaseURL string
}

type JWT struct {
	Secret string
}

func Load() *Config {
	return &Config{
		Server: Server{
			Port: getEnv("PORT", "8080"),
		},
		Database: Database{
			DSN: getEnv("DATABASE_DSN", "postgres://finapp:finapp@127.0.0.1:5433/finapp?sslmode=disable"),
		},
		ML: ML{
			BaseURL: getEnv("ML_SERVICE_URL", "http://localhost:8000"),
		},
		JWT: JWT{
			Secret: getEnv("JWT_SECRET", "finapp-collection-secret-change-in-prod"),
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
