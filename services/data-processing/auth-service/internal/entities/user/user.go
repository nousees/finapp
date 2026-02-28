package entities

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Email        string    `json:"email" gorm:"not null;uniqueIndex"`
	PasswordHash string    `json:"-" gorm:"not null"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
