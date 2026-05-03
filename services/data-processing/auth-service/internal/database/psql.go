package database

import (
	"context"
	"database/sql"
	"fmt"

	"finapp/services/data-processing/auth-service/config"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type Database struct {
	Pool *pgxpool.Pool
}

func NewPostgresConnection(config config.Postgres) (*Database, error) {
	// Use standard lib/pq compatible DSN
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		config.Username,
		config.Password,
		config.Host,
		config.DBPort,
		config.DBName,
		config.SSLMode)

	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}

	// Force simple protocol to avoid SASL issues
	poolConfig.ConnConfig.TLSConfig = nil

	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, err
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}

	return &Database{Pool: pool}, nil
}

func (db *Database) Close() {
	db.Pool.Close()
}

func (db *Database) GetSQLDB() *sql.DB {
	return &sql.DB{}
}
