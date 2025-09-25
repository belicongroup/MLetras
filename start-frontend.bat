@echo off
echo Starting MLetras Frontend...
echo.

echo Killing any existing Node processes...
taskkill /F /IM node.exe 2>nul

echo Starting development server...
echo The app will be available at: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
