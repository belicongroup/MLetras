@echo off
echo ========================================
echo  MLetras Auth - Deploy and Test
echo ========================================
echo.

cd /d %~dp0

set /p ENV="Deploy to (dev/prod)? [dev]: "
if "%ENV%"=="" set ENV=dev

echo.
echo ========================================
echo  Step 1: Verify Secrets
echo ========================================
echo.

npx wrangler secret list

echo.
echo Do the secrets look correct?
pause

echo.
echo ========================================
echo  Step 2: Deploy Worker
echo ========================================
echo.

if "%ENV%"=="prod" (
    echo Deploying to PRODUCTION...
    npx wrangler deploy --env production
) else (
    echo Deploying to DEVELOPMENT...
    npx wrangler deploy --env development
)

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Deployment failed!
    pause
    exit /b 1
)

echo.
echo Deployment successful!
echo.

echo.
echo ========================================
echo  Step 3: Test Email Sending
echo ========================================
echo.

set /p TEST_EMAIL="Enter your email to test (or press Enter to skip): "

if "%TEST_EMAIL%"=="" (
    echo Test skipped.
    goto :end
)

echo.
echo Testing email to %TEST_EMAIL%...
echo.

if "%ENV%"=="prod" (
    set URL=https://auth.mletras.com/test-email
) else (
    set URL=https://mletras-auth-api-dev.belicongroup.workers.dev/test-email
)

curl -X POST %URL% ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%TEST_EMAIL%\"}"

echo.
echo.
echo Check your email inbox!
echo.

:end
echo.
echo ========================================
echo  Deployment Complete!
echo ========================================
echo.
if "%ENV%"=="prod" (
    echo Production URL: https://auth.mletras.com
    echo                  https://api.mletras.com
) else (
    echo Development URL: https://mletras-auth-api-dev.belicongroup.workers.dev
)
echo.
echo Monitor logs at: https://dash.cloudflare.com/
echo.
pause

