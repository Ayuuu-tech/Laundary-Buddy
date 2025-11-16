param(
  [int]$Port = 3000
)

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "No process is listening on port $Port"
  exit 0
}

$connections | ForEach-Object {
  try {
    Write-Host ("Killing PID {0} on port {1}" -f $_.OwningProcess, $Port)
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop
  } catch {
    Write-Warning ("Failed to kill PID {0}: {1}" -f $_.OwningProcess, $_.Exception.Message)
  }
}

Write-Host "Done."
