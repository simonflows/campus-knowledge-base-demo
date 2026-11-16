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
node "scripts\start-launcher.mjs" %*
set "RC=%errorlevel%"
if not "%~1"=="--dry-run" (
    echo.
    pause
)
exit /b %RC%
