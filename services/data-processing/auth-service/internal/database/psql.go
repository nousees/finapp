package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

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

	// PostgreSQL can report healthy before it is fully ready for a new service
	// connection, especially after a clean volume initialization. Retry the ping
	// so auth does not exit and block the rest of the compose stack.
	var lastErr error
	for attempt := 1; attempt <= 30; attempt++ {
		if err := pool.Ping(context.Background()); err == nil {
			return &Database{Pool: pool}, nil
		} else {
			lastErr = err
		}

		time.Sleep(time.Second)
	}

	pool.Close()
	return nil, lastErr
}

func (db *Database) Close() {
	db.Pool.Close()
}

func (db *Database) GetSQLDB() *sql.DB {
	return &sql.DB{}
}
