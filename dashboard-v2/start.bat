@echo off
chcp 65001 >nul 2>&1

echo.
echo  =============================================
echo    Synapse  --  Full Dev Stack
echo    Dashboard:  http://localhost:5173
echo    Backend:    http://localhost:3001
echo    Extension:  loaded in VS Code (debug mode)
echo  =============================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

where code >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [WARN] VS Code CLI not found. Extension step will be skipped.
    echo         Fix: Open VS Code ^> Cmd Palette ^> "Shell Command: Install 'code' in PATH"
    echo.
    set SKIP_EXT=1
) else (
    set SKIP_EXT=0
)

:: ── Step 1: Backend deps ────────────────────────────────────────────────────
echo  [1/6] Checking backend dependencies...
if not exist "..\backend-local\node_modules" (
    echo  [1/6] Installing backend dependencies...
    pushd ..\backend-local
    npm install --silent
    popd
) else (
    echo  [1/6] Backend dependencies OK
)

:: ── Step 2: Dashboard deps ──────────────────────────────────────────────────
echo  [2/6] Checking dashboard dependencies...
if not exist "node_modules" (
    echo  [2/6] Installing dashboard dependencies...
    npm install --silent
) else (
    echo  [2/6] Dashboard dependencies OK
)

:: ── Step 3: Extension deps ──────────────────────────────────────────────────
if "%SKIP_EXT%"=="0" (
    echo  [3/6] Checking extension dependencies...
    if not exist "..\extension\node_modules" (
        echo  [3/6] Installing extension dependencies...
        pushd ..\extension
        npm install --silent
        popd
    ) else (
        echo  [3/6] Extension dependencies OK
    )
) else (
    echo  [3/6] Skipping extension ^(VS Code CLI not in PATH^)
)

:: ── Step 4: Compile extension ───────────────────────────────────────────────
if "%SKIP_EXT%"=="0" (
    echo  [4/6] Compiling extension TypeScript...
    pushd ..\extension
    npm run compile >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo  [WARN] Extension compile had errors. Check ..\extension\src manually.
    ) else (
        echo  [4/6] Extension compiled OK
    )
    popd
) else (
    echo  [4/6] Skipping extension compile
)

:: ── Step 5: Start backend ───────────────────────────────────────────────────
echo  [5/6] Starting backend on :3001...
start "Synapse Backend" cmd /k "cd /d %~dp0..\backend-local && node server.js"

:: Give backend a moment to boot
timeout /t 2 /nobreak >nul

:: ── Step 6: Launch VS Code with extension in debug mode ─────────────────────
if "%SKIP_EXT%"=="0" (
    echo  [6/6] Launching VS Code with Synapse extension loaded...
    echo.
    echo  ┌─────────────────────────────────────────────────────────┐
    echo  │  VS Code will open in Extension Development Host mode.  │
    echo  │  Open any .py file to trigger the extension.            │
    echo  │                                                         │
    echo  │  Set these in VS Code Settings (Ctrl+,):                │
    echo  │    synapse.apiEndpoint  =  http://localhost:3001        │
    echo  │    synapse.cohortId     =  YOUR_CLASSROOM_ID            │
    echo  │    synapse.studentId    =  your@email.com               │
    echo  └─────────────────────────────────────────────────────────┘
    echo.
    start "" code --extensionDevelopmentPath="%~dp0..\extension"
) else (
    echo  [6/6] Skipping VS Code launch
)

:: ── Start dashboard (foreground) ────────────────────────────────────────────
echo.
echo  Ready!  Open http://localhost:5173 in your browser.
echo  Press Ctrl+C to stop the dashboard (close Backend window separately).
echo.

npm run dev
