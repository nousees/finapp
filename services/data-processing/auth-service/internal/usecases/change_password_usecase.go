package usecases

import (
	"errors"
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/repository"
	"finapp/services/data-processing/auth-service/pkg/hash"

	"github.com/google/uuid"
)

type ChangePasswordUsecase struct {
	Users repository.UserRepository
}

func NewChangePasswordUsecase(users repository.UserRepository) *ChangePasswordUsecase {
	return &ChangePasswordUsecase{Users: users}
}

func (u *ChangePasswordUsecase) ChangePassword(userID uuid.UUID, input entities.ChangePasswordInput) error {
	user, err := u.Users.GetUserByID(userID)
	if err != nil {
		return errors.New("user not found")
	}
	if !hash.CompareHash(user.PasswordHash, input.CurrentPassword) {
		return errors.New("current password is invalid")
	}
	if input.CurrentPassword == input.NewPassword {
		return errors.New("new password must be different")
	}
	newHash, err := hash.GenerateHash(input.NewPassword)
	if err != nil {
		return err
	}
	return u.Users.UpdatePasswordHash(userID, newHash)
}
