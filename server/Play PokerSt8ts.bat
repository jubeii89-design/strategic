@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but was not found on this PC.
  echo Install it from https://nodejs.org, then double-click this file again.
  pause
  exit /b 1
)

node server.js
if errorlevel 1 pause
