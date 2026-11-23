@echo off
TITLE ASRTEX Textile POS Launcher
echo ====================================================
echo Starting ASRTEX Textile POS Application System...
echo ====================================================

cd /d "%~dp0backend"
start "ASRTEX Backend API" cmd /k "npm run dev"

cd /d "%~dp0frontend"
start "ASRTEX POS UI" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:3000

echo Application launched! Opening browser at http://localhost:3000...
