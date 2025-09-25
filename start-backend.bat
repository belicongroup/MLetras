@echo off
echo ========================================
   MLetras Backend Server
========================================

echo Starting MLetras authentication backend...
echo.

cd /d "%~dp0mletras-auth-backend"
node simple-backend.js

pause
