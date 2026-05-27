param(
  [string]$GatewayUrl = "http://localhost:8080",
  [string]$VerificationCode = $env:FINAPP_E2E_VERIFY_CODE
)

$ErrorActionPreference = "Stop"

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Uri = "$GatewayUrl$Path"
    Method = $Method
    Headers = $Headers
  }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 20)
  }
  return Invoke-RestMethod @params
}

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) {
    throw "Auth E2E assertion failed: $Message"
  }
  Write-Host "OK: $Message" -ForegroundColor Green
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "auth-e2e-$stamp@finapp.local"
$password = "FinApp12345!"

Write-Host "== signup ==" -ForegroundColor Cyan
$signup = Invoke-Json -Method "POST" -Path "/api/v1/auth/signup" -Body @{
  email = $email
  password = $password
  full_name = "FinApp Auth E2E"
  phone = "+79990000001"
}
Assert-True ($signup.status -eq "success") "signup returns success"

if ($signup.requires_email_verification -eq $true) {
  Write-Host "== verify-code ==" -ForegroundColor Cyan
  if ([string]::IsNullOrWhiteSpace($VerificationCode)) {
    throw "Signup requires email verification. Set FINAPP_E2E_VERIFY_CODE for the test mailbox."
  }
  $verify = Invoke-Json -Method "POST" -Path "/api/v1/auth/verify-email-code" -Body @{
    email = $email
    password = $password
    code = $VerificationCode
  }
  Assert-True ([string]::IsNullOrWhiteSpace($verify.access_token) -eq $false) "verify-code returns access token"
} else {
  Assert-True ([string]::IsNullOrWhiteSpace($signup.access_token) -eq $false) "signup auto-login returns access token"
}

Write-Host "== login ==" -ForegroundColor Cyan
$login = Invoke-Json -Method "POST" -Path "/api/v1/auth/signin" -Body @{
  email = $email
  password = $password
}
Assert-True ([string]::IsNullOrWhiteSpace($login.access_token) -eq $false) "login returns access token"
Assert-True ([string]::IsNullOrWhiteSpace($login.refresh_token) -eq $false) "login returns refresh token"

Write-Host "Auth E2E passed for $email" -ForegroundColor Green
