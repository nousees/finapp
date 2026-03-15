package config

import "os"

type Config struct {
	Server   Server
	Database Database
	JWT      JWT
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

func Load() *Config {
	return &Config{
		Server: Server{
			Port: getEnv("PORT", "8082"),
		},
		Database: Database{
			DSN: getEnv("DATABASE_DSN", "postgres://finapp:finapp@localhost:5432/finapp?sslmode=disable"),
		},
		JWT: JWT{
			Secret: getEnv("JWT_SECRET", "finapp-subscription-secret-change-in-prod"),
		},
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
