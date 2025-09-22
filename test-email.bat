@echo off
echo ========================================
echo    MLetras Email Testing Environment
echo ========================================
echo.
echo This will start both backend and frontend for REAL EMAIL testing
echo Emails will be sent via Resend to the email addresses you enter
echo.
echo Starting backend with email support in a new window...
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
echo 3. Enter a REAL email address to test OTP
echo 4. Check your email inbox for the OTP code
echo 5. Use that OTP code in the frontend
echo.
echo NOTE: Real emails will be sent via Resend!
echo.
echo Press any key to close this window...
pause
