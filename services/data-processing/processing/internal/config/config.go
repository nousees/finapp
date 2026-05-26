package config

import "os"

type Config struct {
	Server   Server
	Database Database
	JWT      JWT
	ML       ML
}

type Server struct {
	Port string
}

type Database struct {
	DSN string
}

type JWT struct {
	Secret string
}

type ML struct {
	BaseURL string
}

func Load() *Config {
	return &Config{
		Server: Server{
			Port: getEnv("PORT", "8081"),
		},
		Database: Database{
			DSN: getEnv("DATABASE_DSN", "postgres://finapp:finapp@localhost:5432/finapp?sslmode=disable"),
		},
		JWT: JWT{
			Secret: getEnv("JWT_SECRET", "finapp-processing-secret-change-in-prod"),
		},
		ML: ML{
			BaseURL: getEnv("ML_SERVICE_URL", "http://localhost:8000"),
		},
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
