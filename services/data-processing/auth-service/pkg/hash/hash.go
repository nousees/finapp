package hash

import (
	"github.com/alexedwards/argon2id"
)

func GenerateHash(password string) (string, error) {
	hash, err := argon2id.CreateHash(password, argon2id.DefaultParams)
	return hash, err
}

func CompareHash(hashedPwd, plainPwd string) bool {
	match, _ := argon2id.ComparePasswordAndHash(plainPwd, hashedPwd)
	return match
}
