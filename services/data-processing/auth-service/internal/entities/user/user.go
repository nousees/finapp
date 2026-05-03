package entities

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                  uuid.UUID `json:"id"`
	Email               string    `json:"email"`
	PasswordHash        string    `json:"-"`
	FullName            string    `json:"full_name"`
	Phone               string    `json:"phone"`
	AvatarURL           string    `json:"avatar_url"`
	Timezone            string    `json:"timezone"`
	CurrencyPreference  string    `json:"currency_preference"`
	DateFormat          string    `json:"date_format"`
	FinancialStartDay   int       `json:"financial_start_day"`
	IsPremium           bool      `json:"is_premium"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}
