@echo off
title Sonix Server Launcher
echo.
echo  ╔══════════════════════════════╗
echo  ║       SONIX SERVERS          ║
echo  ╚══════════════════════════════╝
echo.

echo [1/2] Starting Laravel Backend...
start "Laravel Backend" cmd /k "cd /d C:\Users\HEYTHEM\Downloads\social-platform\laravel-backend && php artisan serve --port=5000 --host=0.0.0.0"
timeout /t 2 /nobreak >nul

echo [2/2] Starting Expo...
start "Expo" cmd /k "cd /d C:\Users\HEYTHEM\Downloads\social-platform\expo-app && npx expo start --host lan"
timeout /t 1 /nobreak >nul

echo.
echo  ╔══════════════════════════════╗
echo  ║  Backend:  192.168.1.9:5000  ║
echo  ║  Expo:     scan QR code      ║
echo  ╚══════════════════════════════╝
echo.
echo  Close this window or press any key to keep it open.
pause >nul
