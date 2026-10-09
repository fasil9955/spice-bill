@echo off
cd /d "%~dp0"

if exist spices-billing-new.jar (
  echo Applying billing update...
  :waitlock
  ping 127.0.0.1 -n 4 >nul
  del /f /q spices-billing.jar 2>nul
  if exist spices-billing.jar goto waitlock
  ren spices-billing-new.jar spices-billing.jar
)

if not exist spices-billing.jar (
  echo spices-billing.jar is missing in this folder.
  pause
  exit /b 1
)

java -jar spices-billing.jar --spring.config.additional-location=file:./
pause
