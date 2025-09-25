@echo off
echo ========================================
   MLetras Android Emulator Testing
========================================

echo.
echo This script will help you test MLetras on Android emulator
echo.

REM Check if Android emulator is running
echo Checking Android emulator status...
adb devices > temp_devices.txt 2>nul
findstr /C:"emulator" temp_devices.txt >nul
if %errorlevel% neq 0 (
    echo.
    echo ❌ No Android emulator detected!
    echo.
    echo Please start an Android emulator first:
    echo 1. Open Android Studio
    echo 2. Go to Tools ^> AVD Manager
    echo 3. Start an emulator
    echo.
    echo Then run this script again.
    pause
    goto :cleanup
)

echo ✅ Android emulator detected!
echo.

REM Get emulator IP
for /f "tokens=2" %%a in ('adb shell ip route ^| findstr wlan0') do set EMULATOR_IP=%%a
if "%EMULATOR_IP%"=="" (
    echo Warning: Could not detect emulator IP. Using default 10.0.2.2
    set EMULATOR_IP=10.0.2.2
)

echo Emulator IP: %EMULATOR_IP%
echo.

REM Install dependencies if needed
echo Installing Capacitor dependencies...
npm install

REM Build the app
echo Building the app...
npm run build

REM Sync with Capacitor
echo Syncing with Capacitor...
npx cap sync android

echo.
echo ========================================
   Ready to Test on Android Emulator
========================================
echo.
echo Choose an option:
echo.
echo 1. Open Android Studio (recommended for first-time setup)
echo 2. Run directly on emulator (requires Android Studio configured)
echo 3. Build APK only
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Opening Android Studio...
    npx cap open android
    echo.
    echo In Android Studio:
    echo 1. Wait for Gradle sync to complete
    echo 2. Click the Run button (green play icon)
    echo 3. Select your emulator from the device list
    echo.
    goto :cleanup
)

if "%choice%"=="2" (
    echo Running on emulator...
    npx cap run android
    goto :cleanup
)

if "%choice%"=="3" (
    echo Building APK...
    npx cap run android --no-sync
    goto :cleanup
)

if "%choice%"=="4" (
    goto :cleanup
)

echo Invalid choice. Exiting...
goto :cleanup

:cleanup
del temp_devices.txt 2>nul
echo.
echo Script completed.
pause
