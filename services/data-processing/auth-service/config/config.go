package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type (
	Config struct {
		DB     Postgres `mapstructure:"postgres"`
		Server Server   `mapstructure:"server"`
		JWT    JWT      `mapstructure:"jwt"`
	}

	Server struct {
		Port string `mapstructure:"port"`
	}

	Postgres struct {
		Host           string `mapstructure:"db_host"`
		DBPort         string `mapstructure:"db_port"`
		DBExternalPort string `mapstructure:"db_external_port"`
		Username       string `mapstructure:"db_username"`
		DBName         string `mapstructure:"db_name"`
		SSLMode        string `mapstructure:"db_sslmode"`
		Password       string `mapstructure:"db_password"`
	}

	JWT struct {
		Secret     string        `mapstructure:"secret"`
		AccessTTL  time.Duration `mapstructure:"access_ttl"`
		RefreshTTL time.Duration `mapstructure:"refresh_ttl"`
		Issuer     string        `mapstructure:"issuer"`
	}
)

func LoadConfig() Config {
	cfg := Config{}

	err := godotenv.Load("./.env")
	if err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}

	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("config/")

	err = viper.ReadInConfig()
	if err != nil {
		log.Fatalf("Error reading config file, %s", err)
	}

	for _, key := range viper.AllKeys() {
		anyValue := viper.Get(key)
		str, ok := anyValue.(string)
		if !ok {
			continue
		}

		replacedStr := os.ExpandEnv(str)
		viper.Set(key, replacedStr)
	}

	if err := viper.Unmarshal(&cfg); err != nil {
		log.Fatalf("Unable to decode into structure, %v", err)
	}

	if cfg.JWT.AccessTTL == 0 {
		if d, err := time.ParseDuration(viper.GetString("jwt.access_ttl")); err == nil {
			cfg.JWT.AccessTTL = d
		}
	}
	if cfg.JWT.RefreshTTL == 0 {
		if d, err := time.ParseDuration(viper.GetString("jwt.refresh_ttl")); err == nil {
			cfg.JWT.RefreshTTL = d
		}
	}
	if cfg.JWT.Issuer == "" {
		cfg.JWT.Issuer = viper.GetString("jwt.issuer")
	}

	return cfg
}
