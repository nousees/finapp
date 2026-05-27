param(
  [string]$GatewayUrl = "http://localhost:8080",
  [string]$MlUrl = "http://localhost:8000",
  [Parameter(Mandatory = $true)]
  [string]$VoiceFile
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
    throw "Voice E2E assertion failed: $Message"
  }
  Write-Host "OK: $Message" -ForegroundColor Green
}

if (-not (Test-Path $VoiceFile)) {
  throw "Voice file not found: $VoiceFile"
}
if ($PSVersionTable.PSVersion.Major -lt 7) {
  throw "PowerShell 7+ is required for Invoke-RestMethod -Form multipart upload."
}

Write-Host "== ml health ==" -ForegroundColor Cyan
$mlHealth = Invoke-RestMethod -Uri "$MlUrl/health" -Method GET
Assert-True ($mlHealth.ready -eq $true) "ml-service is ready"

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "voice-e2e-$stamp@finapp.local"
$password = "FinApp12345!"

Write-Host "== auth ==" -ForegroundColor Cyan
$signup = Invoke-Json -Method "POST" -Path "/api/v1/auth/signup" -Body @{
  email = $email
  password = $password
  full_name = "FinApp Voice E2E"
  phone = "+79990000002"
}
Assert-True ([string]::IsNullOrWhiteSpace($signup.access_token) -eq $false) "signup returns access token"
$headers = @{ Authorization = "Bearer $($signup.access_token)" }

Write-Host "== upload -> transcribe -> enrich -> transaction ==" -ForegroundColor Cyan
$voice = Invoke-RestMethod `
  -Uri "$GatewayUrl/api/v1/voice/transaction" `
  -Method POST `
  -Headers $headers `
  -Form @{ file = Get-Item $VoiceFile; auto_create = "true" }

Assert-True ($null -ne $voice.transcription) "voice response contains transcription"
Assert-True ([string]::IsNullOrWhiteSpace($voice.transcription.transcribed_text) -eq $false) "voice was transcribed"
Assert-True ($null -ne $voice.enrichment) "voice response contains enrichment"
Assert-True ($null -ne $voice.transaction) "voice transaction was created"

Write-Host "Voice E2E passed for $VoiceFile" -ForegroundColor Green
