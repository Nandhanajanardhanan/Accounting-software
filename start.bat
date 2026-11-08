@echo off
title Freelance Books
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Double-click setup.bat first.
  pause
  exit /b 1
)

if not exist node_modules goto prepare
if not exist dist\index.html goto prepare
goto run

:prepare
echo First run: preparing the app. This takes a few minutes...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto failed
call npm.cmd run build
if errorlevel 1 goto failed

:run
echo ========================================================
echo   Your books are open at http://localhost:3001
echo   Keep this window open while you work.
echo   Close it when you are done - everything is saved.
echo ========================================================
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:3001"
node server\index.js
pause
exit /b 0

:failed
echo.
echo The app could not be prepared. See the message above.
pause
exit /b 1
