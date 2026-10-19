@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-demo.ps1"
if errorlevel 1 (
  echo Demo startup failed. Read the error above.
) else (
  start "" "http://localhost:3000/vi"
)
pause
