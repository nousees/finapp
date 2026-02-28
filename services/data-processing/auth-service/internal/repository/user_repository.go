package repository

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"errors"

	"gorm.io/gorm"
	"github.com/google/uuid"
)

type UserRepository interface {
	Create(user *entities.User) error
	GetUserByEmail(email string) (*entities.User, error)
}

type Users struct {
	db *gorm.DB
}

func NewUsers(db *gorm.DB) *Users {
	return &Users{db}
}

func (us *Users) Create(user *entities.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	return us.db.Create(user).Error
}

func (us *Users) GetUserByEmail(email string) (*entities.User, error) {
	var user entities.User
	err := us.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &user, err
}
