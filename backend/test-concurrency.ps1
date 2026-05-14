# ==============================================================
# Concurrency stress test for /reservations
# Demonstrates that the SELECT ... FOR UPDATE in the transaction
# correctly prevents double-booking of the same seat.
#
# Usage:
#   .\test-concurrency.ps1
# ==============================================================

$ErrorActionPreference = 'Stop'

# --- Config -------------------------------------------------
$BackendUrl  = 'http://localhost:3000'
$KeycloakUrl = 'http://localhost:8080'
$Realm       = 'theatre-booking'
$ClientId    = 'mobile-app'
$Username    = 'testuser'
$Password    = '12345'
$ShowtimeId  = 5     # ο Βυσσινόκηπος - fresh showtime
$SeatId      = 201   # μια συγκεκριμένη θέση που θα διεκδικήσουν
$ParallelJobs = 10

# --- 1. Get a fresh JWT -------------------------------------
Write-Host "`n[1/4] Getting token from Keycloak..." -ForegroundColor Cyan
$body = @{
  grant_type = 'password'
  client_id  = $ClientId
  username   = $Username
  password   = $Password
}
$tokenResp = Invoke-RestMethod -Uri "$KeycloakUrl/realms/$Realm/protocol/openid-connect/token" `
  -Method Post -Body $body
$token = $tokenResp.access_token
Write-Host "      OK (token length = $($token.Length))" -ForegroundColor Green

# --- 2. Sanity check that the chosen seat is currently free -
Write-Host "`n[2/4] Checking seat $SeatId is available..." -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }
$seats = Invoke-RestMethod -Uri "$BackendUrl/showtimes/$ShowtimeId/seats" -Headers $headers
$target = $seats | Where-Object { $_.seat_id -eq $SeatId }
if (-not $target) {
  Write-Host "      Seat $SeatId not found for showtime $ShowtimeId. Aborting." -ForegroundColor Red
  exit 1
}
Write-Host "      Seat $SeatId status: $($target.status)" -ForegroundColor Green
if ($target.status -ne 'available') {
  Write-Host "      Seat is not available. Cancel any existing reservation first." -ForegroundColor Yellow
  exit 1
}

# --- 3. Fire N parallel reservation attempts on the same seat
Write-Host "`n[3/4] Firing $ParallelJobs parallel reservation attempts on seat $SeatId..." -ForegroundColor Cyan

$scriptBlock = {
  param($url, $token, $showtimeId, $seatId, $jobNum)
  $body = @{ showtime_id = $showtimeId; seat_ids = @($seatId) } | ConvertTo-Json
  $headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
  try {
    $r = Invoke-RestMethod -Uri "$url/reservations" -Method Post -Headers $headers -Body $body
    return [pscustomobject]@{ Job = $jobNum; Result = 'SUCCESS'; Detail = "reservation_id=$($r.reservation_id)" }
  } catch {
    $msg = $_.ErrorDetails.Message
    $status = $_.Exception.Response.StatusCode.value__
    return [pscustomobject]@{ Job = $jobNum; Result = "HTTP $status"; Detail = $msg }
  }
}

$jobs = 1..$ParallelJobs | ForEach-Object {
  Start-Job -ScriptBlock $scriptBlock -ArgumentList $BackendUrl, $token, $ShowtimeId, $SeatId, $_
}

$results = $jobs | Wait-Job | Receive-Job
$jobs    | Remove-Job

# --- 4. Report ---------------------------------------------
Write-Host "`n[4/4] Results:" -ForegroundColor Cyan
$results = $results | Sort-Object Job
$results | Format-Table -AutoSize

$successes = @($results | Where-Object { $_.Result -eq 'SUCCESS' }).Count
$failures  = $ParallelJobs - $successes

Write-Host ""
if ($successes -eq 1) {
  Write-Host "PASS: Exactly 1 reservation succeeded out of $ParallelJobs concurrent attempts." -ForegroundColor Green
  Write-Host "      The transaction + SELECT ... FOR UPDATE prevented all double-bookings." -ForegroundColor Green
} else {
  Write-Host "FAIL: Expected exactly 1 success, got $successes." -ForegroundColor Red
}
Write-Host ""
