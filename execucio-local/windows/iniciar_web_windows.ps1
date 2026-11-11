<#
.SYNOPSIS
    Iniciador intel·ligent i totalment automàtic de la web del curs a Windows.
    Comprova si Quarto està instal·lat; si no hi és, l'instal·la tot sol,
    inicia el servidor local i obre la web al navegador predeterminat.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  SISTEMES OPERATIUS (UdL - Campus Igualada)" -ForegroundColor White
Write-Host "  Iniciador automatic i intel-ligent del servidor local" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

function Refresh-EnvPath {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $env:Path = "$userPath;$machinePath"
}

function Find-QuartoExecutable {
    $cmd = Get-Command quarto -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $paths = @(
        "$env:LOCALAPPDATA\Programs\Quarto\bin\quarto.exe",
        "C:\Program Files\Quarto\bin\quarto.exe",
        "C:\Program Files (x86)\Quarto\bin\quarto.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

$qExe = Find-QuartoExecutable

# Auto-instal·lació intel·ligent si no es troba Quarto
if (-not $qExe) {
    Write-Host "[!] Quarto no s'ha detectat al sistema." -ForegroundColor Yellow
    Write-Host "[*] Instal-lant Quarto oficial automaticament (sense requerir intervencio)..." -ForegroundColor Cyan
    
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "    -> Descarregant via winget..." -ForegroundColor Gray
        Start-Process winget -ArgumentList "install --id Posit.Quarto -e --accept-package-agreements --accept-source-agreements --silent" -NoNewWindow -Wait
        Refresh-EnvPath
        $qExe = Find-QuartoExecutable
    }

    if (-not $qExe) {
        Write-Host "    -> Descarregant directament de GitHub releases..." -ForegroundColor Gray
        $msiUrl = "https://github.com/quarto-dev/quarto-cli/releases/download/v1.6.42/quarto-1.6.42-win.msi"
        $tempMsi = Join-Path $env:TEMP "quarto_setup.msi"
        try {
            Invoke-WebRequest -Uri $msiUrl -OutFile $tempMsi -UseBasicParsing
            Start-Process msiexec.exe -ArgumentList "/i `"$tempMsi`" /quiet /qn /norestart" -Wait
            Refresh-EnvPath
            $qExe = Find-QuartoExecutable
        } catch {
            Write-Host " [X] Error descarregant Quarto: $_" -ForegroundColor Red
        }
    }

    if (-not $qExe) {
        Write-Host ""
        Write-Host " [X] No s'ha pogut auto-instal-lar Quarto. Descarrega'l de: https://quarto.org/docs/get-started/" -ForegroundColor Red
        Read-Host " Prem Enter per tancar"
        exit 1
    }
    Write-Host " [OK] Quarto instal-lat amb exit!" -ForegroundColor Green
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

Write-Host " [OK] Quarto detectat: $(& $qExe --version)" -ForegroundColor Green
Write-Host " [*] Directori del projecte: $RepoRoot" -ForegroundColor Gray
Write-Host " [*] Iniciant el servidor i obrint la web al navegador..." -ForegroundColor Cyan
Write-Host " [*] Prem CTRL + C per aturar el servidor local." -ForegroundColor Yellow
Write-Host ""

Push-Location $RepoRoot
try {
    & $qExe preview
} finally {
    Pop-Location
}
