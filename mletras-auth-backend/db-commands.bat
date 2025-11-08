@echo off
echo ========================================
echo    MLetras Database Management
echo ========================================

:menu
echo.
echo Choose an option:
echo 1. View all users
echo 2. View OTPs
echo 3. View usage logs
echo 4. View system config
echo 5. Clear all OTPs
echo 6. Clear usage logs
echo 7. Add test user
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto view_users
if "%choice%"=="2" goto view_otps
if "%choice%"=="3" goto view_usage
if "%choice%"=="4" goto view_config
if "%choice%"=="5" goto clear_otps
if "%choice%"=="6" goto clear_usage
if "%choice%"=="7" goto add_test_user
if "%choice%"=="8" goto exit
goto menu

:view_users
echo.
echo === Users ===
npx wrangler d1 execute mletras-auth-db --local --command="SELECT id, email, subscription_type, email_verified, created_at, last_login_at FROM users ORDER BY created_at DESC;"
goto menu

:view_otps
echo.
echo === OTPs ===
npx wrangler d1 execute mletras-auth-db --local --command="SELECT email, code, type, created_at, expires_at, used_at FROM otps ORDER BY created_at DESC LIMIT 10;"
goto menu

:view_usage
echo.
echo === Usage Logs ===
npx wrangler d1 execute mletras-auth-db --local --command="SELECT user_id, endpoint, request_count, date FROM usage_logs ORDER BY date DESC, request_count DESC;"
goto menu

:view_config
echo.
echo === System Config ===
npx wrangler d1 execute mletras-auth-db --local --command="SELECT * FROM system_config;"
goto menu

:clear_otps
echo.
echo Clearing all OTPs...
npx wrangler d1 execute mletras-auth-db --local --command="DELETE FROM otps;"
echo OTPs cleared.
goto menu

:clear_usage
echo.
echo Clearing all usage logs...
npx wrangler d1 execute mletras-auth-db --local --command="DELETE FROM usage_logs;"
echo Usage logs cleared.
goto menu

:add_test_user
echo.
echo Adding test user...
npx wrangler d1 execute mletras-auth-db --local --command="INSERT INTO users (id, email, email_verified, subscription_type) VALUES ('test-001', 'test@example.com', 1, 'free');"
echo Test user added: test@example.com
goto menu

:exit
echo.
echo Goodbye!
exit












