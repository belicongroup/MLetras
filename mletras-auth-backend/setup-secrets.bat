@echo off
echo ========================================
echo  MLetras Auth - Setup Secrets
echo ========================================
echo.

cd /d %~dp0

echo This script will configure required secrets for the MLetras authentication system.
echo.
echo Required secrets:
echo   1. EMAIL_API_KEY - Resend API key for sending OTP emails
echo   2. JWT_SECRET - Secret key for JWT token generation
echo.
pause

echo.
echo ========================================
echo  1. Setting up EMAIL_API_KEY
echo ========================================
echo.
echo Your Resend API Key: re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6
echo.
echo This will be sent to Cloudflare Workers...
echo.

echo re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6 | npx wrangler secret put EMAIL_API_KEY

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to set EMAIL_API_KEY!
    echo Please make sure you're logged in to Cloudflare:
    echo    npx wrangler login
    echo.
    pause
    exit /b 1
)

echo.
echo EMAIL_API_KEY configured successfully!
echo.

echo.
echo ========================================
echo  2. Setting up JWT_SECRET
echo ========================================
echo.
echo Generating a secure random JWT secret...
echo.

:: Generate a random JWT secret
set JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%

echo Your JWT_SECRET: %JWT_SECRET%
echo.
echo Setting JWT_SECRET...
echo.

echo %JWT_SECRET% | npx wrangler secret put JWT_SECRET

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to set JWT_SECRET!
    echo Please manually run:
    echo    npx wrangler secret put JWT_SECRET
    echo And paste: %JWT_SECRET%
    echo.
    pause
    exit /b 1
)

echo.
echo JWT_SECRET configured successfully!
echo.

echo.
echo ========================================
echo  Verification
echo ========================================
echo.
echo Listing all configured secrets...
echo.

npx wrangler secret list

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Both secrets have been configured in Cloudflare Workers.
echo.
echo Next steps:
echo   1. Deploy your worker: npm run deploy
echo   2. Test email sending: verify-secrets.bat
echo.
pause






