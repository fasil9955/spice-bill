@echo off
title Spices Billing System
color 0A

echo ========================================
echo   Starting Spices Billing System
echo ========================================
echo.

REM Always run from the folder where this .bat lives (C:\SpicesBilling)
cd /d "%~dp0"

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java is not installed!
    echo Please install Java JDK 17
    pause
    exit /b 1
)

REM Check if MySQL is running
sc query MySQL80 | find "RUNNING" >nul
if errorlevel 1 (
    echo [WARNING] MySQL service might not be running
    echo Starting MySQL service...
    net start MySQL80
    timeout /t 5 /nobreak
)

REM One-time: old JAR name -^> spices-billing.jar (needed for auto-update)
if not exist "spices-billing.jar" if exist "spices-billing-system-1.0.0.jar" (
    echo Copying spices-billing-system-1.0.0.jar to spices-billing.jar
    copy /y "spices-billing-system-1.0.0.jar" "spices-billing.jar" >nul
)

REM Apply a downloaded update if present
if exist "spices-billing-update.jar" (
    echo Applying billing update...
    copy /y "spices-billing-update.jar" "spices-billing.jar"
    del "spices-billing-update.jar"
)
if exist "spices-billing-new.jar" (
    echo Applying billing update...
    copy /y "spices-billing-new.jar" "spices-billing.jar"
    del "spices-billing-new.jar"
)

if not exist "spices-billing.jar" (
    echo [ERROR] spices-billing.jar is missing in this folder:
    echo %CD%
    echo Put spices-billing.jar here, or keep spices-billing-system-1.0.0.jar for one-time copy.
    pause
    exit /b 1
)

echo Starting application...
echo.
echo Application will be available at:
echo http://localhost:8080
echo.
echo Press Ctrl+C to stop the application
echo.

java -jar spices-billing.jar --spring.config.additional-location=file:./

pause
