package config

import (
	"os"
	"time"
)

type (
	Config struct {
		DB     Postgres
		Server Server
		JWT    JWT
	}

	Server struct {
		Port string
	}

	Postgres struct {
		Host           string
		DBPort         string
		DBExternalPort string
		Username       string
		DBName         string
		SSLMode        string
		Password       string
	}

	JWT struct {
		Secret     string
		AccessTTL  time.Duration
		RefreshTTL time.Duration
		Issuer     string
	}
)

func LoadConfig() Config {
	return Config{
		DB: Postgres{
			Host:           env("DB_HOST", "postgres"),
			DBPort:         env("DB_PORT", "5432"),
			DBExternalPort: env("DB_EXTERNAL_PORT", "5433"),
			Username:       env("DB_USERNAME", "finapp"),
			DBName:         env("DB_NAME", "finapp"),
			SSLMode:        env("DB_SSLMODE", "disable"),
			Password:       env("DB_PASSWORD", "finapp"),
		},
		Server: Server{
			Port: env("PORT", "8082"),
		},
		JWT: JWT{
			Secret:     env("JWT_SECRET", "finapp-dev-secret"),
			AccessTTL:  durationEnv("JWT_ACCESS_TTL", 15*time.Minute),
			RefreshTTL: durationEnv("JWT_REFRESH_TTL", 30*24*time.Hour),
			Issuer:     env("JWT_ISSUER", "finapp-auth"),
		},
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	duration, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return duration
}
