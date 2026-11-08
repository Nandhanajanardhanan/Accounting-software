@echo off
title Freelance Books - Setup
cd /d "%~dp0"
echo ========================================================
echo   Setting up Freelance Books on this computer
echo ========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this computer.
  echo.
  echo  1. Opening https://nodejs.org in your browser now.
  echo  2. Download the "LTS" version and install it with the default options.
  echo  3. Then double-click setup.bat again.
  start "" "https://nodejs.org"
  echo.
  pause
  exit /b 1
)

node -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 (
  echo Your Node.js is too old. This app needs version 22.13 or newer.
  echo Installed version:
  node -v
  echo.
  echo Opening https://nodejs.org - install the "LTS" version, then run setup.bat again.
  start "" "https://nodejs.org"
  echo.
  pause
  exit /b 1
)

echo [1/3] Installing what the app needs (needs internet, takes a few minutes)...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto failed

echo.
echo [2/3] Preparing the app...
call npm.cmd run build
if errorlevel 1 goto failed

echo.
echo [3/3] Adding a "Freelance Books" shortcut to your desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Freelance Books.lnk');" ^
  "$s.TargetPath = '%~dp0start.bat';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.IconLocation = '%SystemRoot%\System32\shell32.dll,43';" ^
  "$s.WindowStyle = 7;" ^
  "$s.Description = 'Open Freelance Books';" ^
  "$s.Save()"

echo.
echo ========================================================
echo   Done! Double-click "Freelance Books" on your desktop
echo   whenever you want to open your books.
echo.
echo   First time: on the welcome screen choose to restore a
echo   backup and pick the my-books-backup.json file in this
echo   folder to bring your existing entries across.
echo ========================================================
echo.
pause
exit /b 0

:failed
echo.
echo Setup could not finish. Check your internet connection and the message above,
echo then double-click setup.bat to try again.
pause
exit /b 1
