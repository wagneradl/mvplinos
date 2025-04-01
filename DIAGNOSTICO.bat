@echo off
echo =======================================================
echo      FERRAMENTA DE DIAGNÓSTICO - LINO'S PANIFICADORA
echo =======================================================
echo.
echo Esta ferramenta irá verificar o estado do seu sistema
echo e gerar um relatório para enviar ao suporte técnico.
echo.
echo Pressione qualquer tecla para continuar...
pause > nul

echo.
echo Verificando ambiente WSL...
wsl --status

echo.
echo Verificando Ubuntu WSL...
wsl --list --verbose

echo.
echo Executando diagnóstico completo...
powershell -Command "wsl -d Ubuntu -e cd /mnt/%~dp0 ^&^& ./scripts/wsl/status-report.sh"

echo.
echo =======================================================
echo   DIAGNÓSTICO CONCLUÍDO!
echo =======================================================
echo.
echo Um relatório detalhado foi gerado na pasta 'reports'.
echo.
echo Por favor, envie este relatório para suporte@linos.com.br
echo em caso de problemas com o sistema.
echo.
echo Pressione qualquer tecla para sair...
pause > nul