# Garden Master - Deploy Script
# Build -> Git commit+push -> Firebase deploy

Set-Location $PSScriptRoot

Write-Host "[1/5] Bumping cache version..." -ForegroundColor Cyan
node scripts/bump-version.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Version bump failed" -ForegroundColor Red; exit 1 }

Write-Host "[2/5] Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Build failed" -ForegroundColor Red; exit 1 }

Write-Host "[3/5] Git staging..." -ForegroundColor Cyan
git add .
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
$msg = "deploy: $date"
git commit -m $msg
# exit code 1 = nothing to commit, that is OK

Write-Host "[4/5] Git push..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Push failed" -ForegroundColor Red; exit 1 }

Write-Host "[5/5] Firebase deploy..." -ForegroundColor Cyan
npx firebase deploy --only hosting --project gardanmaster-2d5db
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Firebase deploy failed" -ForegroundColor Red; exit 1 }

Write-Host "[OK] Deploy complete!" -ForegroundColor Green
