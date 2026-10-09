@echo off
REM Usage: release 1.1.2
if "%~1"=="" (
  echo Usage: release 1.1.2
  echo Bumps version, builds JAR, pushes Git, uploads GitHub Release.
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
