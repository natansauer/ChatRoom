@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === ChatRoom - instalacao ===
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale o Node.js LTS em https://nodejs.org e execute de novo.
  pause
  exit /b 1
)
echo Node.js:
node -v
echo.
echo Instalando dependencias (pode levar alguns minutos)...
call npm install
if errorlevel 1 (
  echo [ERRO] npm install falhou. Veja a mensagem acima.
  pause
  exit /b 1
)
echo.
echo Alinhando versoes com o Expo SDK 54...
call npx expo install --fix
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo Arquivo .env criado. Preencha a URL e a chave do Supabase e salve.
  start notepad ".env"
)
echo.
echo Pronto. Proximo passo: 2-iniciar.bat
pause
