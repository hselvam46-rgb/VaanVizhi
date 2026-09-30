param (
    [string]$RepoUrl
)

if (-not $RepoUrl) {
    $RepoUrl = Read-Host "Enter your GitHub repository URL (e.g. https://github.com/username/vaanvizhi.git)"
}

if ($RepoUrl) {
    Write-Host "[*] Adding remote origin $RepoUrl..." -ForegroundColor Cyan
    git remote remove origin 2>$null
    git remote add origin $RepoUrl
    Write-Host "[*] Pushing to main branch..." -ForegroundColor Green
    git push -u origin main
    Write-Host "[+] Code successfully pushed! You can now link this repo to Render.com or Koyeb for 24/7 hosting." -ForegroundColor Green
} else {
    Write-Host "No URL entered. Aborted." -ForegroundColor Yellow
}
