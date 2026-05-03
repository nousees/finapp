package database

import (
	"finapp/services/data-processing/auth-service/config"
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewPostgresConnection(config config.Postgres) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%s user=%s dbname=%s sslmode=%s password=%s",
		config.Host,
		config.DBPort,
		config.Username,
		config.DBName,
		config.SSLMode,
		config.Password)
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		return nil, err
	}

	err = db.AutoMigrate(&entities.User{})
	if err != nil {
		return nil, err
	}

	return db, nil
}
