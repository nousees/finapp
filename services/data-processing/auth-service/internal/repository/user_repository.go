package repository

import (
	"context"
	"database/sql"
	entities "finapp/services/data-processing/auth-service/internal/entities/user"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository interface {
	Create(user *entities.User) error
	GetUserByEmail(email string) (*entities.User, error)
}

type Users struct {
	pool *pgxpool.Pool
}

func NewUsers(pool *pgxpool.Pool) *Users {
	return &Users{pool}
}

func (us *Users) Create(user *entities.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = time.Now()
	}

	query := `
		INSERT INTO users (id, email, password_hash, full_name, phone, avatar_url, 
			timezone, currency_preference, date_format, financial_start_day, is_premium, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (email) DO NOTHING
	`

	_, err := us.pool.Exec(context.Background(), query,
		user.ID, user.Email, user.PasswordHash, user.FullName, user.Phone, user.AvatarURL,
		user.Timezone, user.CurrencyPreference, user.DateFormat, user.FinancialStartDay,
		user.IsPremium, user.CreatedAt, user.UpdatedAt)

	return err
}

func (us *Users) GetUserByEmail(email string) (*entities.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, avatar_url, 
			timezone, currency_preference, date_format, financial_start_day, is_premium, 
			created_at, updated_at
		FROM users 
		WHERE email = $1
	`

	var user entities.User
	err := us.pool.QueryRow(context.Background(), query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.Phone, &user.AvatarURL,
		&user.Timezone, &user.CurrencyPreference, &user.DateFormat, &user.FinancialStartDay,
		&user.IsPremium, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	return &user, nil
}
