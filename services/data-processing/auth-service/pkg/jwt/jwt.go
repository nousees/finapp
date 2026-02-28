package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Manager struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
	issuer     string
}

type Claims struct {
	UserID string `json:"user_id"`
	Type   string `json:"typ"`
	jwt.RegisteredClaims
}

func NewManager(secret string, accessTTL, refreshTTL time.Duration, issuer string) (*Manager, error) {
	if secret == "" {
		return nil, errors.New("jwt secret is empty")
	}
	if accessTTL <= 0 {
		accessTTL = 15 * time.Minute
	}
	if refreshTTL <= 0 {
		refreshTTL = 30 * 24 * time.Hour
	}
	if issuer == "" {
		issuer = "finapp-auth"
	}
	return &Manager{
		secret:     []byte(secret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
		issuer:     issuer,
	}, nil
}

func (m *Manager) AccessTTLSeconds() int64 {
	return int64(m.accessTTL.Seconds())
}

func (m *Manager) GenerateAccessToken(userID uuid.UUID) (string, error) {
	return m.generateToken(userID, "access", m.accessTTL)
}

func (m *Manager) GenerateRefreshToken(userID uuid.UUID) (string, error) {
	return m.generateToken(userID, "refresh", m.refreshTTL)
}

func (m *Manager) Parse(tokenString string, expectedType string) (uuid.UUID, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil {
		return uuid.Nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return uuid.Nil, errors.New("invalid token claims")
	}
	if expectedType != "" && claims.Type != expectedType {
		return uuid.Nil, errors.New("invalid token type")
	}
	uid, err := uuid.Parse(claims.UserID)
	if err != nil {
		return uuid.Nil, errors.New("invalid user id")
	}
	return uid, nil
}

func (m *Manager) generateToken(userID uuid.UUID, typ string, ttl time.Duration) (string, error) {
	now := time.Now().UTC()
	claims := Claims{
		UserID: userID.String(),
		Type:   typ,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}
