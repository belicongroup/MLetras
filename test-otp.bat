@echo off
echo ========================================
echo    MLetras OTP Testing Environment
echo ========================================
echo.
echo This will start both backend and frontend for OTP testing
echo OTP codes will be displayed in the backend console
echo.
echo Starting backend in a new window...
start "MLetras Backend" cmd /k "cd /d %~dp0 && npm install && npm start"

echo.
echo Starting frontend in a new window...
start "MLetras Frontend" cmd /k "cd /d %~dp0mletras-auth-frontend && npm install && npm run dev"

echo.
echo ========================================
echo    Services Starting...
echo ========================================
echo.
echo Backend: http://localhost:8787
echo Frontend: http://localhost:3000
echo.
echo Instructions:
echo 1. Wait for both services to start
echo 2. Open http://localhost:3000 in your browser
echo 3. Enter any email address to test OTP
echo 4. Check the backend window for the OTP code
echo 5. Use that OTP code in the frontend
echo.
echo Press any key to close this window...
pause
