@echo off
chcp 65001 >nul 2>&1

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   Synapse Dashboard v2 (React)        ║
echo  ║   Starting on http://localhost:3000   ║
echo  ╚═══════════════════════════════════════╝
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo  [OK] Node.js found. Starting dev server...
echo.

npm run dev
