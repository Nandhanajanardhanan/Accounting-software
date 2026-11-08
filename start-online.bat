@echo off
title Freelance Books - online
cd /d "%~dp0"

rem Opens the books on your fixed ngrok link, behind the login in .env.

if not exist .env (
  echo The settings file .env is missing. It holds the login and your ngrok address.
  pause
  exit /b 1
)

set NGROK_DOMAIN=
set BOOKS_USER=
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if "%%a"=="NGROK_DOMAIN" set NGROK_DOMAIN=%%b
  if "%%a"=="BOOKS_USER" set BOOKS_USER=%%b
)
if "%BOOKS_USER%"=="" (
  echo No login is set in .env ^(BOOKS_USER and BOOKS_PASSWORD^). The books will not go online without one.
  pause
  exit /b 1
)
if "%NGROK_DOMAIN%"=="" (
  echo Put your ngrok address in .env first, on the line NGROK_DOMAIN=
  echo You find it at https://dashboard.ngrok.com  ^>  Domains.
  pause
  exit /b 1
)

where ngrok >nul 2>nul
if errorlevel 1 (
  echo ngrok is not installed. See "HOW TO PUT ONLINE.txt".
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Double-click setup.bat first.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing what the app needs...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 goto failed
)
echo Preparing the latest version of the app...
call npm.cmd run build
if errorlevel 1 goto failed

echo.
echo ========================================================
echo   Your books are online at:  https://%NGROK_DOMAIN%
echo   Login: %BOOKS_USER%   (password is in .env)
echo.
echo   Keep this window and the two small ones open.
echo   Close them to take the books offline.
echo ========================================================
echo.
start "Freelance Books server" /min node server\index.js
timeout /t 2 /nobreak >nul
start "ngrok link" /min ngrok http 3001 --url=%NGROK_DOMAIN%
timeout /t 3 /nobreak >nul
start "" "https://%NGROK_DOMAIN%"
pause
exit /b 0

:failed
echo.
echo The app could not be prepared. See the message above.
pause
exit /b 1
