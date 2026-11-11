@echo off
chcp 65001 >nul
title Sistemes Operatius UdL - Servidor Local Interactiu (Windows)

echo ==================================================================
echo   SISTEMES OPERATIUS (UdL - Campus Igualada)
echo   Iniciador automatic i intel-ligent del servidor local
echo ==================================================================
echo.

:: 1. Comprovar si Quarto esta al PATH
where quarto >nul 2>nul
if not errorlevel 1 goto :iniciar

:: 2. Si no esta al PATH, comprovar rutes habituals de Windows
if exist "%LOCALAPPDATA%\Programs\Quarto\bin\quarto.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\Quarto\bin;%PATH%"
    goto :iniciar
)
if exist "C:\Program Files\Quarto\bin\quarto.exe" (
    set "PATH=C:\Program Files\Quarto\bin;%PATH%"
    goto :iniciar
)
if exist "C:\Program Files (x86)\Quarto\bin\quarto.exe" (
    set "PATH=C:\Program Files (x86)\Quarto\bin;%PATH%"
    goto :iniciar
)

:: 3. Si Quarto no esta instal-lat, instal-lar-lo automaticament via winget
echo [!] Quarto no s'ha trobat al teu equip.
echo [*] Descarregant i instal-lant Quarto oficial automaticament (via winget)...
echo     (Aquest pas nomes es fa un cop i pot trigar 1-2 minuts)
echo.

where winget >nul 2>nul
if not errorlevel 1 (
    winget install --id Posit.Quarto -e --accept-package-agreements --accept-source-agreements --silent
    if exist "%LOCALAPPDATA%\Programs\Quarto\bin\quarto.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\Quarto\bin;%PATH%"
    )
    if exist "C:\Program Files\Quarto\bin\quarto.exe" (
        set "PATH=C:\Program Files\Quarto\bin;%PATH%"
    )
) else (
    echo [!] winget no disponible. Descarregant l'instal-lador de Quarto via PowerShell...
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/quarto-dev/quarto-cli/releases/download/v1.6.42/quarto-1.6.42-win.msi' -OutFile '%TEMP%\quarto_setup.msi'; Start-Process msiexec.exe -ArgumentList '/i', '%TEMP%\quarto_setup.msi', '/quiet', '/qn', '/norestart' -Wait"
    if exist "C:\Program Files\Quarto\bin\quarto.exe" (
        set "PATH=C:\Program Files\Quarto\bin;%PATH%"
    )
)

where quarto >nul 2>nul
if errorlevel 1 (
    echo.
    echo [X] No s'ha pogut completar la instal-lacio automatica.
    echo     Pots instal-lar-lo manualment des de: https://quarto.org/docs/get-started/
    echo.
    pause
    exit /b 1
)

:iniciar
echo [OK] Quarto esta llest!
cd /d "%~dp0\..\.."
echo [*] Directori del projecte: %CD%
echo [*] Iniciant el servidor local i obrint el teu navegador...
echo [*] Quan vulguis sortir, prem CTRL + C en aquesta finestra.
echo.

quarto preview
if errorlevel 1 (
    echo.
    echo [X] S'ha produit un error inesperat amb Quarto.
    pause
)
