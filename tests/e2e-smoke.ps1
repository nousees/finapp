param(
  [string]$GatewayUrl = "http://localhost:8080",
  [string]$MlUrl = "http://localhost:8000",
  [string]$VoiceFile = ""
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) {
    throw "E2E assertion failed: $Message"
  }
  Write-Host "OK: $Message" -ForegroundColor Green
}

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

function Get-EnvelopeData($Response) {
  if ($null -ne $Response.data) {
    return $Response.data
  }
  return $Response
}

function New-Transaction {
  param(
    [hashtable]$Headers,
    [decimal]$Amount,
    [string]$Type,
    [string]$Description,
    [string]$Date
  )

  return Invoke-Json -Method "POST" -Path "/api/v1/transactions" -Headers $Headers -Body @{
    amount = $Amount
    currency = "RUB"
    type = $Type
    description = $Description
    date = $Date
  }
}

function Get-TransactionById {
  param(
    [hashtable]$Headers,
    [string]$Id
  )

  $items = Invoke-Json -Method "GET" -Path "/api/v1/transactions?limit=100" -Headers $Headers
  return @($items.transactions) | Where-Object { $_.id -eq $Id } | Select-Object -First 1
}

Write-Step "Gateway and ML health"
$gatewayHealth = Invoke-RestMethod -Uri "$GatewayUrl/health" -Method GET
Assert-True (($gatewayHealth | Out-String).Length -gt 0) "gateway responds"

$mlHealth = Invoke-RestMethod -Uri "$MlUrl/health" -Method GET
Write-Host ("ML status: {0}; whisper real: {1}; load_error: {2}" -f $mlHealth.status, $mlHealth.models.whisper.real, $mlHealth.models.whisper.load_error)
Assert-True ($mlHealth.ready -eq $true) "ml-service reports readiness"

Write-Step "Register and login"
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "e2e-$stamp@finapp.local"
$password = "FinApp12345!"
$signup = Invoke-Json -Method "POST" -Path "/api/v1/auth/signup" -Body @{
  email = $email
  password = $password
  full_name = "FinApp E2E"
  phone = "+79990000000"
}
Assert-True ([string]::IsNullOrWhiteSpace($signup.access_token) -eq $false) "registration returns access token"

$login = Invoke-Json -Method "POST" -Path "/api/v1/auth/signin" -Body @{
  email = $email
  password = $password
}
Assert-True ([string]::IsNullOrWhiteSpace($login.access_token) -eq $false) "login returns access token"

$headers = @{ Authorization = "Bearer $($login.access_token)" }

$today = Get-Date
$monthStartDate = [DateTime]::new($today.Year, $today.Month, 1)
$monthEndDate = $monthStartDate.AddMonths(1).AddDays(-1)
$monthStart = $monthStartDate.ToString("yyyy-MM-dd")
$monthEnd = $monthEndDate.ToString("yyyy-MM-dd")
$todayText = $today.ToString("yyyy-MM-dd")

Write-Step "Manual transaction -> processing -> ML categorization"
$tx = New-Transaction -Headers $headers -Amount 850 -Type "EXPENSE" -Description "пятерочка продукты" -Date $todayText
Start-Sleep -Seconds 1
$txAfterProcessing = Get-TransactionById -Headers $headers -Id $tx.id
$categoryId = $txAfterProcessing.category_id
if ([string]::IsNullOrWhiteSpace($categoryId)) {
  $categoryId = $txAfterProcessing.ml_category_id
}
Assert-True ([string]::IsNullOrWhiteSpace($categoryId) -eq $false) "transaction has category after processing"
Assert-True ($null -ne $txAfterProcessing.ml_confidence) "transaction has ML confidence"

Write-Step "Budget reacts to categorized transaction"
$budget = Invoke-Json -Method "POST" -Path "/api/v1/budgets" -Headers $headers -Body @{
  categoryId = $categoryId
  amountLimit = 3000
  period = "MONTHLY"
  periodStart = $monthStart
  periodEnd = $monthEnd
  currency = "RUB"
  alertThresholds = @(50, 80, 100)
  isActive = $true
}
Assert-True ($null -ne (Get-EnvelopeData $budget).id) "budget created"

$currentBudgets = Invoke-Json -Method "GET" -Path "/api/v1/budgets/current" -Headers $headers
$budgetViews = @(Get-EnvelopeData $currentBudgets)
$matchedBudget = $budgetViews | Where-Object { $_.categoryId -eq $categoryId } | Select-Object -First 1
Assert-True ($null -ne $matchedBudget) "current budget is returned"
Assert-True ([decimal]$matchedBudget.spentAmount -ge 850) "budget spentAmount includes transaction"

Write-Step "Goal, analytics and report"
$goal = Invoke-Json -Method "POST" -Path "/api/v1/goals" -Headers $headers -Body @{
  name = "E2E emergency fund"
  description = "Smoke-test goal"
  targetAmount = 50000
  deadline = $today.AddMonths(3).ToString("yyyy-MM-dd")
  goalType = "SAVING"
  priority = 2
  icon = "target"
  color = "#7ED9B6"
  currency = "RUB"
}
Assert-True ($null -ne (Get-EnvelopeData $goal).id) "goal created"

$insights = Invoke-Json -Method "GET" -Path "/api/v1/insights?periodStart=$monthStart&periodEnd=$monthEnd" -Headers $headers
$insightData = Get-EnvelopeData $insights
Assert-True ($null -ne $insightData.summary) "analytics summary returned"
Assert-True ($null -ne $insightData.goals) "analytics includes goals"

$report = Invoke-Json -Method "POST" -Path "/api/v1/reports/generate?reportType=MONTHLY_SUMMARY&periodStart=$monthStart&periodEnd=$monthEnd" -Headers $headers
Assert-True ($null -ne (Get-EnvelopeData $report).id) "monthly report generated"

Write-Step "Recurring subscription detection and recommendations"
$subDate1 = $today.AddMonths(-2).ToString("yyyy-MM-dd")
$subDate2 = $today.AddMonths(-1).ToString("yyyy-MM-dd")
$subDate3 = $today.ToString("yyyy-MM-dd")
New-Transaction -Headers $headers -Amount 299 -Type "EXPENSE" -Description "Yandex Plus subscription" -Date $subDate1 | Out-Null
New-Transaction -Headers $headers -Amount 299 -Type "EXPENSE" -Description "Yandex Plus subscription" -Date $subDate2 | Out-Null
New-Transaction -Headers $headers -Amount 299 -Type "EXPENSE" -Description "Yandex Plus subscription" -Date $subDate3 | Out-Null

$subscriptions = Invoke-Json -Method "POST" -Path "/api/v1/analyze-subscriptions" -Headers $headers
$subscriptionItems = @($subscriptions.subscriptions)
Assert-True ($subscriptionItems.Count -gt 0) "subscription detector returns subscriptions"

Invoke-Json -Method "POST" -Path "/api/v1/recommendations/generate" -Headers $headers | Out-Null
$recommendations = Invoke-Json -Method "GET" -Path "/api/v1/recommendations/unapplied" -Headers $headers
$recommendationItems = @(Get-EnvelopeData $recommendations)
Assert-True ($recommendationItems.Count -gt 0) "recommendations are generated from real data"

if (-not [string]::IsNullOrWhiteSpace($VoiceFile)) {
  Write-Step "Optional voice file pipeline"
  if (-not (Test-Path $VoiceFile)) {
    throw "Voice file not found: $VoiceFile"
  }
  if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Host "Skipping multipart voice upload: PowerShell 7+ is required for Invoke-RestMethod -Form." -ForegroundColor Yellow
  } else {
    $voice = Invoke-RestMethod `
      -Uri "$GatewayUrl/api/v1/voice/transaction" `
      -Method POST `
      -Headers $headers `
      -Form @{ file = Get-Item $VoiceFile; auto_create = "true" }
    Assert-True ([string]::IsNullOrWhiteSpace($voice.transcription.transcribed_text) -eq $false) "voice file was transcribed"
    Assert-True ($null -ne $voice.transaction) "voice transaction was auto-created"
  }
}

Write-Step "Done"
Write-Host "FinApp E2E smoke passed for $email" -ForegroundColor Green
