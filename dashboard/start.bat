@echo off
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   Synapse Instructor Dashboard       ║
echo  ║   Starting on http://localhost:3000  ║
echo  ╚══════════════════════════════════════╝
echo.

:: Open browser after 1.5s delay
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/auth.html"

:: Try npx serve first (Node.js must be installed)
where node >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Node.js found. Starting server...
    npx -y serve . -p 3000 --no-clipboard
    goto end
)

:: Fallback: Python 3
where python >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python found. Starting server...
    python -m http.server 3000
    goto end
)

:: Fallback: Python 2 style
where python3 >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python3 found. Starting server...
    python3 -m http.server 3000
    goto end
)

echo  [ERROR] Could not find Node.js or Python.
echo  Install Node.js from https://nodejs.org and try again.
pause

:end
