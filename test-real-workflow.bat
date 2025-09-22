@echo off
echo 🎵 MLetras Real-World Testing Workflow
echo =====================================
echo.
echo This will start the frontend to test the complete authentication flow
echo with the deployed Cloudflare Worker.
echo.
echo 📧 You'll receive real emails via Resend
echo 🌐 Frontend will connect to: https://mletras-auth-api-dev.belicongroup.workers.dev
echo.
echo Press any key to start the frontend...
pause >nul

echo.
echo 🚀 Starting MLetras Frontend...
echo.

cd mletras-auth-frontend
npm run dev

echo.
echo ✅ Frontend started! 
echo 🌐 Open: http://localhost:5173
echo 📧 Test with your email: cruz8teen50@gmail.com
echo.
