# One command for shop updates:
#   .\release.ps1 1.1.2
#
# Bumps version, builds spices-billing.jar, pushes Git, uploads GitHub Release.

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Version
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
if (-not $Root) { $Root = Get-Location }

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Version must look like 1.1.2 (got: $Version)"
}

$Pom = Join-Path $Root "backend\pom.xml"
$Props = Join-Path $Root "backend\src\main\resources\application.properties"
$Manifest = Join-Path $Root "update-manifest.json"
$Jar = Join-Path $Root "backend\target\spices-billing.jar"
$Repo = "fasil9955/spice-bill"
$Tag = "v$Version"
$JarUrl = "https://github.com/$Repo/releases/download/$Tag/spices-billing.jar"

Write-Host "=== Release $Version ===" -ForegroundColor Cyan

# 1) Bump version files
$pomText = Get-Content -Raw $Pom
$pomText = [regex]::Replace(
    $pomText,
    '(<artifactId>spices-billing-system</artifactId>\s*<version>)[^<]+',
    "`${1}$Version"
)
Set-Content -Path $Pom -Value $pomText -NoNewline

$propsText = Get-Content -Raw $Props
$propsText = [regex]::Replace($propsText, '(?m)^app\.version=.*$', "app.version=$Version")
Set-Content -Path $Props -Value $propsText -NoNewline

$manifestJson = @"
{
  "version": "$Version",
  "jarUrl": "$JarUrl"
}
"@
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($Manifest, ($manifestJson.Trim() + "`n"), $utf8NoBom)

Write-Host "Bumped pom, application.properties, update-manifest.json"

# 2) Build JAR (includes frontend)
Write-Host "Building JAR (this takes a few minutes)..."
Push-Location (Join-Path $Root "backend")
try {
    & mvn -DskipTests package
    if ($LASTEXITCODE -ne 0) { throw "Maven package failed" }
} finally {
    Pop-Location
}
if (-not (Test-Path $Jar)) { throw "JAR not found: $Jar" }
Write-Host "Built $Jar"

# 3) Push source + manifest (git add . — target/ is gitignored)
git -C $Root add .
git -C $Root commit -m "Release $Version"
if ($LASTEXITCODE -ne 0) { throw "git commit failed (nothing to commit, or git error)" }
git -C $Root push
if ($LASTEXITCODE -ne 0) { throw "git push failed" }
Write-Host "Pushed main"

# 4) GitHub Release with spices-billing.jar
# MSI install updates PATH for NEW terminals only. Reload PATH + check the default install folder.
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")
$ghCmd = $null
$ghFound = Get-Command gh -ErrorAction SilentlyContinue
if ($ghFound) {
    $ghCmd = $ghFound.Source
} else {
    $defaultGh = Join-Path $env:ProgramFiles "GitHub CLI\gh.exe"
    if (Test-Path $defaultGh) { $ghCmd = $defaultGh }
}
if (-not $ghCmd) {
    Write-Host "gh CLI not found. Close this window, open a new Command Prompt, then run:" -ForegroundColor Yellow
    Write-Host "  gh auth login"
    Write-Host "  gh release create $Tag `"$Jar`" --repo $Repo --title $Version --notes `"Shop billing update $Version`""
    throw "Release JAR not uploaded. Code is already on Git."
}
Write-Host "Using $ghCmd"
& $ghCmd release create $Tag $Jar --repo $Repo --title $Version --notes "Shop billing update $Version"
if ($LASTEXITCODE -ne 0) { throw "gh release create failed (run: gh auth login )" }

Write-Host ""
Write-Host "Done. Shop PCs with internet will see $Version after they click Update." -ForegroundColor Green
Write-Host "  Manifest: https://raw.githubusercontent.com/$Repo/main/update-manifest.json"
Write-Host "  JAR:      $JarUrl"
