@echo off
echo ========================================
echo    MLetras Auth - Local Development
echo ========================================

echo.
echo 1. Installing dependencies...
call npm install

echo.
echo 2. Setting up local development environment...
echo Creating local D1 database...
call npx wrangler d1 create mletras-auth-db --local

echo.
echo 3. Running local database migrations...
call npx wrangler d1 migrations apply mletras-auth-db --local

echo.
echo 4. Setting up local secrets...
echo Setting up Resend email service...
echo re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6 | npx wrangler secret put EMAIL_API_KEY

echo.
echo Please set JWT_SECRET (generate a random 32+ character string):
echo npx wrangler secret put JWT_SECRET

echo.
echo 5. Starting local development server...
echo Your local auth API will be available at: http://localhost:8787
echo.
echo Database management commands:
echo - View users: npx wrangler d1 execute mletras-auth-db --local --command="SELECT * FROM users;"
echo - View OTPs: npx wrangler d1 execute mletras-auth-db --local --command="SELECT * FROM otps;"
echo - View usage: npx wrangler d1 execute mletras-auth-db --local --command="SELECT * FROM usage_logs;"
echo.
call npx wrangler dev --local



