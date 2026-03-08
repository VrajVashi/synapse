@echo off
chcp 65001 >nul 2>&1

echo.
echo  =============================================
echo    Synapse Dashboard v2 (React + Backend)
echo    Dashboard:  http://localhost:5173
echo    Backend:    http://localhost:3001
echo  =============================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Install backend dependencies if needed
echo  [1/4] Checking backend dependencies...
if not exist "..\backend-local\node_modules" (
    echo  [1/4] Installing backend dependencies...
    pushd ..\backend-local
    npm install
    popd
) else (
    echo  [1/4] Backend dependencies OK
)

:: Install dashboard dependencies if needed
echo  [2/4] Checking dashboard dependencies...
if not exist "node_modules" (
    echo  [2/4] Installing dashboard dependencies...
    npm install
) else (
    echo  [2/4] Dashboard dependencies OK
)

:: Start backend in a separate window
echo  [3/4] Starting backend server on :3001...
start "Synapse Backend" cmd /c "cd /d %~dp0..\backend-local && node server.js"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start dashboard dev server
echo  [4/4] Starting dashboard on :5173...
echo.
echo  Ready! Open http://localhost:5173 in your browser.
echo  Press Ctrl+C to stop the dashboard (close the Backend window manually).
echo.

npm run dev
