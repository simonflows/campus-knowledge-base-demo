@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 20+ not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)
node "scripts\setup-keys.mjs" %*
set "RC=%errorlevel%"
echo.
pause
exit /b %RC%
