@echo off
echo ========================================
echo  Testing Resend API Directly
echo ========================================
echo.

set EMAIL_API_KEY=re_HrbJBEbs_Gzh5UT5R2G5mhjqe1ttwAeQo
set TEST_EMAIL=cruz8teen50@gmail.com

echo Testing Resend API with email: %TEST_EMAIL%
echo Using API Key: %EMAIL_API_KEY%
echo.

curl -X POST https://api.resend.com/emails ^
  -H "Authorization: Bearer %EMAIL_API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"from\":\"MLetras ^<noreply@mail.mletras.com^>\",\"to\":[\"%TEST_EMAIL%\"],\"subject\":\"Test from Direct API\",\"html\":\"^<p^>This is a direct test from Resend API^</p^>\"}"

echo.
echo.
echo ========================================
echo Check the response above for errors
echo ========================================
pause

