@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === ChatRoom - iniciando por tunel (redes diferentes / firewall) ===
call npx expo start --tunnel -c
pause
