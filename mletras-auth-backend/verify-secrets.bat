@echo off
echo ========================================
echo  MLetras - Verify Email Configuration
echo ========================================
echo.

cd /d %~dp0

echo Checking Cloudflare Worker secrets...
echo.

echo 1. Checking EMAIL_API_KEY...
npx wrangler secret list

echo.
echo ========================================
echo.
echo If EMAIL_API_KEY is missing, run:
echo    npx wrangler secret put EMAIL_API_KEY
echo.
echo Then paste your Resend API key: re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6
echo.
echo If JWT_SECRET is missing, run:
echo    npx wrangler secret put JWT_SECRET
echo.
echo Then paste a secure random string (32+ characters).
echo.
echo ========================================
echo.
echo Testing email sending...
echo.

set /p TEST_EMAIL="Enter your email to test (or press Enter to skip): "

if "%TEST_EMAIL%"=="" (
    echo Test skipped.
    goto :end
)

echo.
echo Sending test email to %TEST_EMAIL%...
echo.

curl -X POST https://mletras-auth-api-dev.belicongroup.workers.dev/test-email ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%TEST_EMAIL%\"}"

echo.
echo.
echo ========================================
echo Check your email inbox for the test message.
echo Also check the Cloudflare Worker logs at:
echo https://dash.cloudflare.com/
echo ========================================

:end
echo.
pause

