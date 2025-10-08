@echo off
echo ========================================
echo  MLetras - Apply Database Migration
echo ========================================
echo.

cd /d %~dp0

echo This will apply the user data tables migration (track_id support).
echo.
pause

echo.
echo Applying migration 0002_user_data_tables.sql...
echo.

npx wrangler d1 execute mletras-auth-db --file=migrations/0002_user_data_tables.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Migration failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Migration Applied Successfully!
echo ========================================
echo.
echo Next step: Deploy the updated worker
echo    npm run deploy
echo.
pause

