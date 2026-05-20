# Garden Master — Deploy Script
# Build → Git commit+push → Firebase deploy

Set-Location $PSScriptRoot

Write-Host "📦 Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build failed" -ForegroundColor Red; exit 1 }

Write-Host "📝 Git commit..." -ForegroundColor Cyan
git add .
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "deploy: $date"
# ถ้าไม่มีอะไร commit ก็ไม่เป็นไร

Write-Host "⬆️  Git push..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Push failed" -ForegroundColor Red; exit 1 }

Write-Host "🔥 Deploying to Firebase..." -ForegroundColor Cyan
npx firebase deploy --only hosting --project gardanmaster-2d5db
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Firebase deploy failed" -ForegroundColor Red; exit 1 }

Write-Host "✅ Deploy สำเร็จ!" -ForegroundColor Green
