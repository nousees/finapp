package usecases

import (
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"finapp/services/data-processing/auth-service/internal/repository"
	"finapp/services/data-processing/auth-service/pkg/hash"
	"finapp/services/data-processing/auth-service/pkg/jwt"
	"errors"
)

type SignInUsecase struct {
	Users  repository.UserRepository
	Tokens *jwt.Manager
}

func NewSignInUsecase(users repository.UserRepository, tokens *jwt.Manager) *SignInUsecase {
	return &SignInUsecase{Users: users, Tokens: tokens}
}

func (s *SignInUsecase) SignIn(sinInput entities.SignInInput) (string, string, int64, error) {
	user, err := s.Users.GetUserByEmail(sinInput.Email)
	if err != nil {
		return "", "", 0, errors.New("user not found")
	}

	if !hash.CompareHash(user.PasswordHash, sinInput.Password) {
		return "", "", 0, errors.New("invalid email or password")
	}

	accessToken, err := s.Tokens.GenerateAccessToken(user.ID)
	if err != nil {
		return "", "", 0, err
	}

	refreshToken, err := s.Tokens.GenerateRefreshToken(user.ID)
	if err != nil {
		return "", "", 0, err
	}

	return accessToken, refreshToken, s.Tokens.AccessTTLSeconds(), nil
}
