@echo off
echo ========================================
   MLetras Android Development Setup
========================================

echo.
echo This script will start all services needed for Android emulator testing
echo.

echo 1. Starting Authentication Backend...
start "MLetras Auth Backend" cmd /k "cd /d %~dp0mletras-auth-backend && .\local-dev.bat"

echo.
echo 2. Waiting for backend to start...
timeout /t 10 /nobreak >nul

echo.
echo 3. Starting Frontend Dev Server...
start "MLetras Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================
   Services Starting...
========================================
echo.
echo Backend: http://localhost:8787
echo Frontend: http://localhost:8080
echo.
echo For Android Emulator:
echo - Backend: http://10.0.2.2:8787
echo - Frontend: http://10.0.2.2:8080
echo.
echo Instructions:
echo 1. Wait for both services to start (check the opened windows)
echo 2. Open Android Studio and run the app on emulator
echo 3. Test authentication with any email address
echo 4. Check backend window for OTP codes
echo.
echo Press any key to close this window...
pause
