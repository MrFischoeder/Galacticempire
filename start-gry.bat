@echo off
rem Galactic Empire: one-click start for Windows.
rem Checks Node.js and pnpm (installs them if missing), installs the game's
rem dependencies and starts the game in the browser.
setlocal
cd /d "%~dp0"
title Galactic Empire

echo.
echo  === GALACTIC EMPIRE ===
echo.

rem --- 1. Node.js (20 or newer) ---------------------------------------------
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
where node >nul 2>nul
if errorlevel 1 goto install_node
goto check_node

:install_node
echo [1/4] Brak Node.js. Probuje zainstalowac Node.js LTS przez winget...
where winget >nul 2>nul
if errorlevel 1 goto no_winget
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
set "PATH=%PATH%;%ProgramFiles%\nodejs"
where node >nul 2>nul
if errorlevel 1 goto restart_needed
goto check_node

:no_winget
echo.
echo Nie znalazlem programu winget, wiec nie moge sam zainstalowac Node.js.
echo Za chwile otworzy sie strona https://nodejs.org - pobierz wersje LTS,
echo zainstaluj ja, a potem uruchom ten plik jeszcze raz.
start "" https://nodejs.org
pause
exit /b 1

:restart_needed
echo.
echo Node.js zostal zainstalowany, ale Windows musi odswiezyc ustawienia.
echo Zamknij to okno i uruchom ten plik jeszcze raz.
pause
exit /b 1

:check_node
node -e "process.exit(+process.versions.node.split('.')[0] >= 20 ? 0 : 1)"
if errorlevel 1 goto old_node
for /f "delims=" %%v in ('node -v') do echo [1/4] Node.js %%v - OK
goto pnpm

:old_node
for /f "delims=" %%v in ('node -v') do echo [1/4] Masz Node.js %%v, a gra potrzebuje 20 lub nowszego.
where winget >nul 2>nul
if errorlevel 1 goto no_winget
echo Aktualizuje Node.js przez winget...
winget upgrade -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
goto restart_needed

rem --- 2. pnpm ---------------------------------------------------------------
:pnpm
set "PNPM=pnpm"
where pnpm >nul 2>nul
if not errorlevel 1 goto pnpm_ok
echo [2/4] Brak pnpm. Instaluje pnpm...
call npm install -g pnpm@10
where pnpm >nul 2>nul
if not errorlevel 1 goto pnpm_ok
rem Fallback: run pnpm through npx without a global install.
set "PNPM=npx --yes pnpm@10"
:pnpm_ok
echo [2/4] pnpm - OK

rem --- 3. Dependencies -------------------------------------------------------
echo [3/4] Instaluje biblioteki gry (pierwszy raz moze to potrwac kilka minut)...
call %PNPM% install
if errorlevel 1 goto install_failed

rem --- 4. Start ---------------------------------------------------------------
echo [4/4] Uruchamiam gre. Przegladarka otworzy sie sama.
echo       Adres: http://localhost:5173
echo       Zeby zakonczyc, zamknij to okno (albo Ctrl+C).
echo.
call %PNPM% dev --open
pause
exit /b 0

:install_failed
echo.
echo Instalacja bibliotek sie nie udala. Sprawdz polaczenie z internetem
echo i uruchom ten plik jeszcze raz. Jesli blad sie powtarza, skopiuj
echo komunikat z tego okna i wyslij go.
pause
exit /b 1
