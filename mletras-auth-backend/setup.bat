@echo off
echo Setting up MLetras Auth Backend...

echo.
echo 1. Installing dependencies...
call npm install

echo.
echo 2. Creating D1 database...
call npx wrangler d1 create mletras-auth-db

echo.
echo 3. Creating KV namespace...
call npx wrangler kv namespace create SESSIONS

echo.
echo 4. Setting up secrets...
echo Setting up Resend email service...
echo re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6 | npx wrangler secret put EMAIL_API_KEY
echo.
echo Please set JWT_SECRET (generate a random 32+ character string):
echo npx wrangler secret put JWT_SECRET

echo.
echo 5. Running database migrations...
call npx wrangler d1 migrations apply mletras-auth-db

echo.
echo 6. Deploying worker...
call npx wrangler deploy

echo.
echo Setup complete! 
echo Your auth API is now deployed and ready to use.
echo.
pause
