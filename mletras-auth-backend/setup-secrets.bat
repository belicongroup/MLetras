@echo off
echo Setting up MLetras Auth Secrets...

echo.
echo 1. Setting up Resend email service...
echo re_GWvdJLzz_L6QWWuy1xX48N6REK77vJ5y6 | npx wrangler secret put EMAIL_API_KEY

echo.
echo 2. Please generate and set JWT_SECRET...
echo Generate a random 32+ character string and run:
echo npx wrangler secret put JWT_SECRET
echo.
echo Example JWT_SECRET: %RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%

echo.
echo Secrets setup complete!
echo.
pause



