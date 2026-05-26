# Supabase Auth URL Configuration for FinApp (Email OTP)

This project verifies email with a **6-digit OTP code** (`/auth/v1/otp` + `/auth/v1/verify`) and does **not** rely on redirect links for the main signup flow.

## What to set in Supabase Dashboard

Go to **Authentication → URL Configuration**.

### Site URL
Set a single default URL. For local development, use:

- `http://localhost:3000`

This value is mostly fallback/template context in our OTP flow.

### Redirect URLs
For OTP-code flow, Redirect URLs are optional.

Recommended entries:

- `http://localhost:3000/**` (web/local fallback)
- your production web/app callback URL when available

If your app later uses magic links or OAuth providers, Redirect URLs become required for those flows.

## Why this is enough for this repo

Backend sends OTP with Supabase endpoint `/auth/v1/otp` and verifies code with `/auth/v1/verify`.
No redirect URL is needed to complete code verification in mobile app.

## Related project wiring

- Auth service must have `SUPABASE_ENABLED=true`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Gateway must proxy `/api/v1/auth/verify-email-code` to auth service.
