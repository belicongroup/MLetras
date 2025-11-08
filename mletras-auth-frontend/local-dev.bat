@echo off
echo ========================================
echo    MLetras Frontend - Local Development
echo ========================================

echo.
echo 1. Installing dependencies...
call npm install

echo.
echo 2. Setting up environment for local development...
if not exist .env (
    copy env.example .env
    echo Created .env file
)

echo.
echo 3. Updating .env for local development...
echo VITE_API_BASE_URL=http://localhost:8787 > .env
echo Updated .env to use local backend

echo.
echo 4. Starting development server...
echo Your frontend will be available at: http://localhost:3000
echo Backend API: http://localhost:8787
echo.
call npm run dev












