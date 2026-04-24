$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $repoRoot "backend")

$python = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
  throw "Python venv not found at $python"
}

& $python -m pip install -r requirements.txt
& $python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
