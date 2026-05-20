# Garden Master - Deploy Script
# Build -> Git commit+push -> Firebase deploy

Set-Location $PSScriptRoot

Write-Host "[1/4] Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Build failed" -ForegroundColor Red; exit 1 }

Write-Host "[2/4] Git staging..." -ForegroundColor Cyan
git add .
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
$msg = "deploy: $date"
git commit -m $msg
# exit code 1 = nothing to commit, that is OK

Write-Host "[3/4] Git push..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Push failed" -ForegroundColor Red; exit 1 }

Write-Host "[4/4] Firebase deploy..." -ForegroundColor Cyan
npx firebase deploy --only hosting --project gardanmaster-2d5db
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Firebase deploy failed" -ForegroundColor Red; exit 1 }

Write-Host "[OK] Deploy complete!" -ForegroundColor Green
