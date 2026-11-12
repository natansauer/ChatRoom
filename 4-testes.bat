@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === ChatRoom - verificacoes ===
call npm run typecheck
call npm run test:app
call npm run test:db
pause
