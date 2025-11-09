@echo off
REM NL2Build APK Builder Script for Windows

echo ==================================
echo   NL2Build APK Builder
echo ==================================
echo.

REM Check if Java is installed
echo Checking Java installation...
java -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] Java not found!
    echo Please install Java 17 or higher:
    echo   Download from https://adoptium.net/
    pause
    exit /b 1
)
echo [OK] Java found

REM Check Android SDK
echo.
echo Checking Android SDK...
if defined ANDROID_HOME (
    echo [OK] Android SDK found
) else if defined ANDROID_SDK_ROOT (
    echo [OK] Android SDK found
) else (
    echo [!] Android SDK not found
    echo You can continue, but build may fail
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

REM Clean previous builds
echo.
echo Cleaning previous builds...
call gradlew.bat clean
if %ERRORLEVEL% NEQ 0 (
    echo [X] Clean failed
    pause
    exit /b 1
)
echo [OK] Clean complete

REM Build debug APK
echo.
echo Building debug APK...
echo This may take a few minutes on first run...
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Your APK is ready at:
    echo   app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo To install on your Samsung S23:
    echo   1. Connect your phone via USB
    echo   2. Enable USB debugging on your phone
    echo   3. Run: adb install -r app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Or copy the APK to your phone and install manually.
    echo.
) else (
    echo.
    echo ========================================
    echo   BUILD FAILED
    echo ========================================
    echo.
    echo Common issues:
    echo   1. Android SDK not installed
    echo   2. Wrong Java version (need 17+)
    echo   3. Network issues downloading dependencies
    echo.
    echo Try building with Android Studio instead:
    echo   See BUILD_INSTRUCTIONS.md for details
)

pause
