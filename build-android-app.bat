@echo off
echo ========================================
   MLetras Android App Builder
========================================

echo.
echo This script will build and update the Android app with all recent fixes
echo.

echo 1. Building frontend with latest changes...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)

echo.
echo 2. Syncing with Capacitor...
npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo 3. Opening Android Studio...
npx cap open android

echo.
echo ========================================
   Android Studio Instructions
========================================
echo.
echo In Android Studio:
echo 1. Wait for Gradle sync to complete
echo 2. Go to Build ^> Clean Project
echo 3. Go to Build ^> Rebuild Project
echo 4. Click Run button (green play icon)
echo 5. Select your device/emulator
echo.
echo If you encounter Java version issues:
echo 1. Go to File ^> Project Structure
echo 2. Set Project SDK to Java 17
echo 3. Set Project Language Level to 17
echo.
echo Recent fixes included in this build:
echo ✅ Real-time UI updates for liked songs
echo ✅ Fixed folder management and server sync
echo ✅ Fixed adding songs to folders
echo ✅ Fixed adding notes to folders
echo ✅ Fixed 'Folder not found' error for local folders
echo ✅ Enhanced error handling and logging
echo.
echo Press any key to close this window...
pause
