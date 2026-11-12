@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === ChatRoom - iniciando (mesma rede Wi-Fi) ===
echo Leia o QR Code com o app Expo Go (SDK 54).
call npx expo start -c
pause
