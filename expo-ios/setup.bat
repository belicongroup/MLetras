@echo off
echo Setting up MLetras iOS App for App Store submission...
echo.

echo Installing dependencies...
npm install --legacy-peer-deps

echo.
echo Setting up NativeWind...
npx tailwindcss init

echo.
echo Creating necessary directories...
if not exist "src\components" mkdir src\components
if not exist "src\contexts" mkdir src\contexts
if not exist "src\hooks" mkdir src\hooks
if not exist "src\pages" mkdir src\pages
if not exist "src\services" mkdir src\services
if not exist "src\lib" mkdir src\lib

echo.
echo Setup complete! Next steps:
echo 1. Create an Expo account at https://expo.dev
echo 2. Run: eas login
echo 3. Run: eas build:configure
echo 4. Follow the APP_STORE_SUBMISSION_GUIDE.md for detailed instructions
echo.
echo To test your app locally:
echo npm run web
echo.
pause
