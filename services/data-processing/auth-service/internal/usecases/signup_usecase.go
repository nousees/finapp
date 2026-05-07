package usecases

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/repository"
	"finapp/services/data-processing/auth-service/pkg/hash"
	"errors"
	"database/sql"
)

type SignUpUsecase struct {
	Users repository.UserRepository
}

func NewSignUpUsecase(users repository.UserRepository) *SignUpUsecase {
	return &SignUpUsecase{users}
}

func (s *SignUpUsecase) SignUp(sup entities.SignUpInput) error {
	if _, err := s.Users.GetUserByEmail(sup.Email); err == nil {
		return errors.New("user already exists")
	} else if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	hashPass, err := hash.GenerateHash(sup.Password)
	if err != nil {
		return err
	}

	user := &entities.User{
		Email:        sup.Email,
		PasswordHash: hashPass,
		FullName:     sup.FullName,
	}

	return s.Users.Create(user)
}
