package supabase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	url     string
	anonKey string
	http    *http.Client
}

func NewClient(url, anonKey string) *Client {
	return &Client{url: url, anonKey: anonKey, http: &http.Client{}}
}

func (c *Client) SendEmailOTP(email string) error {
	payload := map[string]any{"email": email, "create_user": false}
	return c.post("/auth/v1/otp", payload)
}

func (c *Client) VerifyEmailOTP(email, token string) error {
	payload := map[string]any{"email": email, "token": token, "type": "email"}
	return c.post("/auth/v1/verify", payload)
}

func (c *Client) post(path string, payload map[string]any) error {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, c.url+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.anonKey)
	req.Header.Set("Authorization", "Bearer "+c.anonKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("supabase request failed with status %d", resp.StatusCode)
	}
	return nil
}
