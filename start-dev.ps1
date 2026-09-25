# Start the C# backend API
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'e:\thesis files\DocuSence_v1\DocuSense.Api'; dotnet run --configuration Release"

Write-Host "Backend starting on http://localhost:5230 ..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Start the frontend
Set-Location "e:\thesis files\DocuSence_v1\widget-wonderland-08"
Write-Host "Starting frontend dev server..." -ForegroundColor Cyan
npm run dev
